import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Course, CourseDocument } from './schemas/course.schema';
import { Attendance, AttendanceDocument } from './schemas/attendance.schema';
import { CourseMaterial, CourseMaterialDocument } from './schemas/course-material.schema';
import { CourseAssignment, CourseAssignmentDocument } from './schemas/course-assignment.schema';
import { mergeAttendanceRecords, normalizeAttendanceDate } from './attendance.utils';

@Injectable()
export class CoursesService {
  constructor(
    @InjectModel(Course.name)
    private courseModel: Model<CourseDocument>,
    @InjectModel(Attendance.name)
    private attendanceModel: Model<AttendanceDocument>,
    @InjectModel(CourseMaterial.name)
    private materialModel: Model<CourseMaterialDocument>,
    @InjectModel(CourseAssignment.name)
    private assignmentModel: Model<CourseAssignmentDocument>,
  ) {}

  async create(createCourseDto: any): Promise<CourseDocument> {
    const createdCourse = new this.courseModel(createCourseDto);
    return createdCourse.save();
  }

  async findAll(): Promise<CourseDocument[]> {
    return this.courseModel.find().exec();
  }

  async findByCode(code: string): Promise<CourseDocument> {
    const course = await this.courseModel.findOne({ code }).exec();
    if (!course) {
      throw new NotFoundException(`Course with code ${code} not found`);
    }
    return course;
  }

  async update(code: string, updateCourseDto: any): Promise<CourseDocument> {
    const { _id, id, ...cleanData } = updateCourseDto;
    const updated = await this.courseModel
      .findOneAndUpdate({ code }, { $set: cleanData }, { returnDocument: 'after' })
      .exec();
    if (!updated) {
      throw new NotFoundException(`Course with code ${code} not found`);
    }
    return updated;
  }

  async remove(code: string): Promise<any> {
    return this.courseModel.deleteOne({ code }).exec();
  }

  // --- ATTENDANCE (ASISTENCIAS) ---
  async getAttendance(courseId?: string) {
    const records = await this.attendanceModel.find(courseId ? { courseId } : {}).lean().exec();
    return mergeAttendanceRecords(records);
  }

  async saveAttendance(courseId: string, date: string, statusMap: Record<string, string>, week?: number): Promise<AttendanceDocument> {
    const isoDate = normalizeAttendanceDate(date);
    if (!courseId?.trim() || !isoDate) throw new BadRequestException('Seleccione un curso y una fecha válida.');
    if (!statusMap || typeof statusMap !== 'object' || Array.isArray(statusMap) || !Object.keys(statusMap).length) {
      throw new BadRequestException('Seleccione al menos un estado de asistencia.');
    }
    if (week !== undefined && (!Number.isInteger(week) || week < 1 || week > 52)) {
      throw new BadRequestException('La semana debe ser un número entre 1 y 52.');
    }
    const fields: Record<string, unknown> = { date: isoDate };
    for (const [dni, status] of Object.entries(statusMap)) {
      if (!/^\d{8}$/.test(dni) || !['Presente', 'Tardanza', 'Falta', 'Justificado'].includes(status)) {
        throw new BadRequestException('DNI o estado de asistencia inválido.');
      }
      fields[`statusMap.${dni}`] = status;
    }
    if (week !== undefined) fields.week = week;
    const [year, month, day] = isoDate.split('-');
    const legacyDate = `${day}/${month}/${year}`;
    // Update only the submitted students. Concurrent edits of other students
    // do not replace the complete status map; historical dates are normalized.
    return this.attendanceModel.findOneAndUpdate(
      { courseId, date: { $in: [isoDate, legacyDate] } },
      { $set: fields, $setOnInsert: { courseId } },
      { upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: false },
    ).exec();
  }

  // --- MATERIALS (MATERIALES / SÍLABOS PDF) ---
  async getMaterials(courseId?: string): Promise<CourseMaterialDocument[]> {
    if (courseId) {
      return this.materialModel.find({ courseId }).exec();
    }
    return this.materialModel.find().exec();
  }

  async saveMaterial(dto: { courseId: string; title: string; fileName: string; date: string }): Promise<CourseMaterialDocument> {
    const newMat = new this.materialModel(dto);
    return newMat.save();
  }

  // --- ASSIGNMENTS (TAREAS Y ENTREGAS DE ALUMNOS) ---
  async getAssignments(courseId?: string): Promise<CourseAssignmentDocument[]> {
    if (courseId) {
      return this.assignmentModel.find({ courseId }).exec();
    }
    return this.assignmentModel.find().exec();
  }

  async saveAssignment(dto: { courseId: string; title: string; description: string; dueDate: string; submissions?: CourseAssignment['submissions'] }): Promise<CourseAssignmentDocument> {
    this.validateAssignmentGrades(dto);
    const newAsg = new this.assignmentModel(dto);
    return newAsg.save();
  }

  private validateAssignmentGrades(dto: { submissions?: any[] }) {
    if (dto.submissions === undefined) return;
    if (!Array.isArray(dto.submissions)) throw new BadRequestException('Las calificaciones deben ser una lista.');
    const students = new Set<string>();
    dto.submissions.forEach((submission) => {
      if (!submission || typeof submission.studentDni !== 'string' || !submission.studentDni.trim() || students.has(submission.studentDni)) {
        throw new BadRequestException('Cada calificación debe identificar a un estudiante sin duplicados.');
      }
      students.add(submission.studentDni);
      if (submission.grade !== undefined && (typeof submission.grade !== 'number' || !Number.isFinite(submission.grade) || submission.grade < 0 || submission.grade > 20)) {
        throw new BadRequestException('La nota debe ser un número entre 0 y 20.');
      }
    });
  }

  async updateAssignment(id: string, dto: any): Promise<CourseAssignmentDocument> {
    this.validateAssignmentGrades(dto);
    const assignment = await this.assignmentModel.findById(id).exec();
    if (!assignment) throw new NotFoundException('Evaluación no encontrada.');
    // IDs, course ownership and metadata are not replaced by a grading request.
    if (dto.submissions) {
      const merged = new Map(assignment.submissions.map((submission) => [submission.studentDni, { ...submission }]));
      dto.submissions.forEach((submission: any) => {
        const previous = merged.get(submission.studentDni);
        merged.set(submission.studentDni, { ...previous, ...submission });
      });
      assignment.submissions = [...merged.values()];
      assignment.markModified('submissions');
    }
    return assignment.save();
  }

  async deleteAssignment(id: string) {
    const deleted = await this.assignmentModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException('Evaluación no encontrada.');
    return { success: true };
  }

  async submitAssignment(assignmentId: string, submission: { studentDni: string; studentName: string; fileName: string; submitDate: string; grade?: number }): Promise<CourseAssignmentDocument> {
    this.validateAssignmentGrades({ submissions: [submission] });
    const asg = await this.assignmentModel.findById(assignmentId).exec();
    if (!asg) {
      throw new NotFoundException(`Tarea con ID ${assignmentId} no encontrada`);
    }
    const existingIndex = asg.submissions.findIndex(s => s.studentDni === submission.studentDni);
    if (existingIndex >= 0) {
      asg.submissions[existingIndex] = { ...asg.submissions[existingIndex], ...submission };
    } else {
      asg.submissions.push(submission);
    }
    asg.markModified('submissions');
    return asg.save();
  }

  // --- CLOSE GRADES (FIRMA Y CIERRE DE ACTAS DE NOTAS) ---
  async closeCourseGrades(code: string, teacherDni: string): Promise<CourseDocument> {
    const course = await this.courseModel.findOne({ code }).exec();
    if (!course) {
      throw new NotFoundException(`Curso con código ${code} no encontrado`);
    }
    course.isGradesClosed = true;
    course.closedByTeacherDni = teacherDni;
    course.closedAt = new Date().toISOString();
    return course.save();
  }
}

