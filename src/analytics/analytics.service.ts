import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Student, StudentDocument } from '../students/schemas/student.schema';
import { Enrollment, EnrollmentDocument } from '../enrollments/schemas/enrollment.schema';
import { Attendance, AttendanceDocument } from '../courses/schemas/attendance.schema';
import { CourseAssignment, CourseAssignmentDocument } from '../courses/schemas/course-assignment.schema';
import { AcademicProgram } from '../mpa/schemas/academic-planning.schemas';
import { mergeAttendanceRecords, normalizeAttendanceDate } from '../courses/attendance.utils';
import { TutoringReferral, TutoringReferralDocument } from './schemas/tutoring-referral.schema';

export interface StudentRiskAssessment {
  studentDni: string;
  studentName: string;
  career: string;
  cycle: string;
  shift: string;
  riskScore: number | null;
  riskLevel: 'CRITICO' | 'MODERADO' | 'BAJO' | 'SIN_DATOS';
  primaryCause: string;
  recommendation: string;
  metrics: {
    attendanceRate: number | null;
    currentGpa: number | null;
    homeworkCompletion: number | null;
    hasOverduePayment: boolean | null;
  };
  referredToTutoring?: boolean;
}
export interface AnalyticsKpis {
  totalEvaluated: number;
  totalStudents: number;
  insufficientDataCount: number;
  retentionRate: number | null;
  criticalCount: number;
  moderateCount: number;
  lowRiskCount: number;
}
export interface AttritionRiskReport {
  kpis: AnalyticsKpis;
  students: StudentRiskAssessment[];
  timestamp: string;
}
const round = (value: number) => Number(value.toFixed(2));
const validGrade = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 20;

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Student.name) private studentModel: Model<StudentDocument>,
    @InjectModel(Enrollment.name) private enrollmentModel: Model<EnrollmentDocument>,
    @InjectModel(Attendance.name) private attendanceModel: Model<AttendanceDocument>,
    @InjectModel(CourseAssignment.name) private assignmentModel: Model<CourseAssignmentDocument>,
    @InjectModel(AcademicProgram.name) private programModel: Model<AcademicProgram>,
    @InjectModel(TutoringReferral.name) private referralModel: Model<TutoringReferralDocument>,
  ) {}

  async calculateAttritionRisk(): Promise<AttritionRiskReport> {
    const [students, enrollments, attendance, assignments, programs, referrals] = await Promise.all([
      this.studentModel.find().lean().exec(), this.enrollmentModel.find().lean().exec(),
      this.attendanceModel.find().lean().exec(), this.assignmentModel.find().lean().exec(),
      this.programModel.find().lean().exec(),
      this.referralModel.find().lean().exec(),
    ]);
    const referredDnis = new Set(referrals.map((referral) => referral.studentDni));
    const enrollMap = new Map(enrollments.map((enr) => [enr.studentDni, enr]));
    const programMap = new Map(programs.map((program) => [program.id, program.name]));
    const dailyAttendance = mergeAttendanceRecords(attendance);
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date());
    const assessed: StudentRiskAssessment[] = students.filter((student) => student.active !== false).map((student) => {
      const enrollment = enrollMap.get(student.dni);
      // Only explicit entries establish membership. Missing keys are not absences.
      const records = dailyAttendance.filter((record) => normalizeAttendanceDate(record.date) && record.date <= today &&
        ['Presente', 'Tardanza', 'Falta', 'Justificado'].includes(record.statusMap?.[student.dni]));
      const attended = records.filter((record) => record.statusMap[student.dni] !== 'Falta').length;
      const attendanceRate = records.length ? round(attended / records.length * 100) : null;
      const courseIds = new Set(records.map((record) => record.courseId));
      // There is no per-student course roster: use observed classroom membership,
      // never all assignments from a career or another classroom.
      const dueAssignments = assignments.filter((assignment) => courseIds.has(assignment.courseId) &&
        assignment.kind !== 'assessment' &&
        assignment.description !== 'Registro de notas consolidado por administración' &&
        /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(assignment.dueDate) && assignment.dueDate.slice(0, 10) < today);
      const delivered = dueAssignments.filter((assignment) => assignment.submissions.some((submission) =>
        submission.studentDni === student.dni && !!submission.fileName && !!submission.submitDate &&
        submission.submitDate.slice(0, 10) <= today));
      const homeworkCompletion = dueAssignments.length ? round(delivered.length / dueAssignments.length * 100) : null;
      // Submission grades distinguish a recorded zero from default zeros in cycle summaries.
      const grades = assignments.flatMap((assignment) => assignment.submissions.filter((submission) =>
        submission.studentDni === student.dni && !!submission.submitDate &&
        submission.submitDate.slice(0, 10) <= today && validGrade(submission.grade))
        .map((submission) => submission.grade as number));
      const gpa = grades.length ? round(grades.reduce((sum, grade) => sum + grade, 0) / grades.length) : null;
      const paymentStatus = enrollment?.paymentStatus;
      // Payment status alone cannot establish arrears without a due date.
      const hasOverduePayment = null;
      const shift = enrollment?.shift || 'Sin turno registrado';
      const latestCycle = [...(student.cycleStatuses || [])].sort((a, b) =>
        b.year - a.year || b.cycleNumber - a.cycleNumber)[0];
      let riskScore: number | null = null;
      let riskLevel: StudentRiskAssessment['riskLevel'] = 'SIN_DATOS';
      let primaryCause = 'Información académica insuficiente para calcular el riesgo.';
      let recommendation = 'Complete los registros de asistencia, calificaciones y entregas para evaluar al estudiante.';
      const paymentKnown = ['Pendiente', 'No Pagado', 'Observado', 'Pagado', 'Validado'].includes(paymentStatus || '');
      const shiftKnown = ['Mañana', 'Tarde', 'Noche'].includes(shift);
      // Existing heuristic weights; score only when every input is available.
      if (attendanceRate !== null && gpa !== null && homeworkCompletion !== null && paymentKnown && shiftKnown) {
        const paymentFactor = paymentStatus === 'Validado' || paymentStatus === 'Pagado' ? 0 : 0.8;
        const shiftFactor = shift === 'Noche' ? 0.6 : shift === 'Tarde' ? 0.3 : 0.1;
        riskScore = round((100 - attendanceRate) / 100 * 0.35 + (20 - gpa) / 20 * 0.30 +
          (100 - homeworkCompletion) / 100 * 0.15 + paymentFactor * 0.10 + shiftFactor * 0.10);
        riskLevel = riskScore >= 0.65 || attendanceRate < 72 || gpa < 10.5 ? 'CRITICO'
          : riskScore >= 0.36 || attendanceRate < 82 || gpa < 12.5 ? 'MODERADO' : 'BAJO';
        primaryCause = `Asistencia registrada: ${attendanceRate}%. Promedio de calificaciones registradas: ${gpa}/20. Entregas: ${homeworkCompletion}%.`;
        recommendation = riskLevel === 'CRITICO' ? 'Revisar el caso con tutoría académica.'
          : riskLevel === 'MODERADO' ? 'Realizar seguimiento académico preventivo.' : 'Continuar el seguimiento académico regular.';
      }
      return {
        studentDni: student.dni, studentName: `${student.name} ${student.lastName}`.trim(),
        career: enrollment ? programMap.get(enrollment.programId) || enrollment.programId : 'Sin carrera registrada',
        cycle: latestCycle ? `Ciclo ${latestCycle.cycleNumber} (${latestCycle.year})` : 'Sin ciclo registrado',
        shift, riskScore, riskLevel, primaryCause, recommendation,
        metrics: { attendanceRate, currentGpa: gpa, homeworkCompletion, hasOverduePayment },
        referredToTutoring: referredDnis.has(student.dni),
      };
    });
    const totalEvaluated = assessed.filter((student) => student.riskLevel !== 'SIN_DATOS').length;
    const criticalCount = assessed.filter((student) => student.riskLevel === 'CRITICO').length;
    return {
      kpis: {
        totalStudents: assessed.length, totalEvaluated, insufficientDataCount: assessed.length - totalEvaluated,
        retentionRate: totalEvaluated ? round((totalEvaluated - criticalCount) / totalEvaluated * 100) : null,
        criticalCount, moderateCount: assessed.filter((student) => student.riskLevel === 'MODERADO').length,
        lowRiskCount: assessed.filter((student) => student.riskLevel === 'BAJO').length,
      },
      students: assessed, timestamp: new Date().toISOString(),
    };
  }
  private validateDni(studentDni: unknown): asserts studentDni is string {
    if (typeof studentDni !== 'string' || !/^\d{8}$/.test(studentDni)) {
      throw new BadRequestException('El DNI debe tener 8 dígitos.');
    }
  }

  listTutoringReferrals() {
    return this.referralModel.find().sort({ registeredAt: -1 }).lean().exec();
  }

  async referStudentToTutoring(studentDni: string, reason?: string) {
    this.validateDni(studentDni);
    if (typeof reason !== 'string' || !reason.trim() || reason.trim().length > 2000) {
      throw new BadRequestException('Ingrese un motivo de hasta 2000 caracteres.');
    }
    const student = await this.studentModel.findOne({ dni: studentDni }).lean().exec();
    if (!student) throw new NotFoundException('Estudiante no encontrado.');
    const initial = { studentDni, studentName: `${student.name} ${student.lastName}`.trim(),
      reason: reason.trim(), registeredAt: new Date(), readAt: null };
    let referral;
    try {
      referral = await this.referralModel.findOneAndUpdate({ studentDni }, { $setOnInsert: initial },
        { upsert: true, returnDocument: 'after', runValidators: true }).lean().exec();
    } catch (error) {
      // Concurrent submissions converge on the unique student notification.
      if ((error as { code?: number }).code !== 11000) throw error;
      referral = await this.referralModel.findOne({ studentDni }).lean().exec();
    }
    if (!referral) throw new NotFoundException('No se pudo recuperar la derivación.');
    return { success: true, studentDni, referral,
      message: 'Derivación guardada. Aviso disponible en la bandeja de MGE.' };
  }

  async markTutoringReferralRead(studentDni: string) {
    this.validateDni(studentDni);
    const existing = await this.referralModel.findOne({ studentDni }).lean().exec();
    if (!existing) throw new NotFoundException('Derivación no encontrada.');
    if (existing.readAt) return existing;
    return this.referralModel.findOneAndUpdate({ studentDni, readAt: null }, { $set: { readAt: new Date() } },
      { returnDocument: 'after' }).lean().exec()
      .then(async (record) => record || this.referralModel.findOne({ studentDni }).lean().exec());
  }

  async updateTutoringCase(studentDni: string, body: { status: string; responsible: string; note: string; revision: number }) {
    this.validateDni(studentDni);
    const statuses = ['PENDIENTE', 'EN_ATENCION', 'CERRADO'];
    if (!body || !statuses.includes(body.status) || typeof body.note !== 'string' || !body.note.trim() || body.note.trim().length > 2000 ||
      typeof body.responsible !== 'string' || body.responsible.trim().length > 150 || !Number.isInteger(body.revision) || body.revision < 0) {
      throw new BadRequestException('Ingrese un estado, responsable y observación válidos.');
    }
    if (body.status !== 'PENDIENTE' && !body.responsible.trim()) throw new BadRequestException('Asigne un responsable antes de atender o cerrar el caso.');
    const current = await this.referralModel.findOne({ studentDni }).lean().exec();
    if (!current) throw new NotFoundException('Derivación no encontrada.');
    const status = current.status || 'PENDIENTE';
    if (status === 'PENDIENTE' && body.status === 'CERRADO') throw new BadRequestException('Inicie la atención antes de cerrar el caso.');
    if (status === 'CERRADO' && body.status === 'CERRADO') throw new BadRequestException('Reabra el caso antes de agregar seguimiento.');
    const date = new Date();
    const revisionFilter = body.revision === 0 ? { $or: [{ revision: 0 }, { revision: { $exists: false } }] } : { revision: body.revision };
    const saved = await this.referralModel.findOneAndUpdate({ studentDni, ...revisionFilter }, {
      $set: { status: body.status, responsible: body.responsible.trim(), closedAt: body.status === 'CERRADO' ? date : null },
      $inc: { revision: 1 },
      $push: { history: { status: body.status, note: body.note.trim(), responsible: body.responsible.trim(), date } },
    }, { returnDocument: 'after', runValidators: true }).lean().exec();
    if (!saved) throw new ConflictException('El caso cambió en otra sesión. Actualice la bandeja antes de guardar.');
    return saved;
  }
}
