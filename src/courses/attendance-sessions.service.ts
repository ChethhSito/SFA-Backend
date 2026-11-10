import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { Attendance, AttendanceDocument } from './schemas/attendance.schema';
import { normalizeAttendanceDate } from './attendance.utils';

const weekdays = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const plain = (value: unknown) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
export type AttendanceActor = { uid: string; role: 'mge' | 'docente'; teacherDni?: string };
export function attendanceToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
export function sessionPayload(row: any) {
  if (!row) return row;
  const value = row.toObject ? row.toObject({ minimize: false }) : row;
  return { ...value, statusMap: value.statusMap || {}, roster: value.roster || [] };
}
export function clockTime(value: unknown): string | null {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec(String(value || '').trim());
  if (!match) return null;
  let hour = Number(match[1]); const minute = Number(match[2]);
  if (minute > 59 || hour > (match[3] ? 12 : 23) || (match[3] && hour < 1)) return null;
  if (match[3]) hour = hour % 12 + (match[3].toUpperCase() === 'PM' ? 12 : 0);
  return `${String(hour).padStart(2, '0')}:${match[2]}`;
}
export function validateSessionDate(date: unknown, row: any, extraordinary?: unknown, _reason?: unknown, today = attendanceToday()) {
  const iso = normalizeAttendanceDate(date);
  if (!iso) throw new BadRequestException('Seleccione una fecha válida.');
  if (extraordinary) throw new BadRequestException('El registro de este caso de uso solo admite clases ordinarias programadas para hoy.');
  if (iso !== today) throw new BadRequestException('La sección seleccionada no se encuentra programada para el día de hoy.');
  if (!row.startDate || !row.endDate || iso < row.startDate || iso > row.endDate) throw new BadRequestException('La fecha debe pertenecer al periodo del grupo.');
  if (row.periodStatus !== 'Activo' || row.periodActive !== true) throw new BadRequestException('El ciclo lectivo no está vigente.');
  if (!weekdays.includes(plain(row.dayOfWeek))) throw new BadRequestException('La programación no tiene un día válido.');
  if (weekdays[new Date(`${iso}T12:00:00Z`).getUTCDay()] !== plain(row.dayOfWeek)) throw new BadRequestException('La sección seleccionada no se encuentra programada para el día de hoy.');
  if (!['Teoría', 'Laboratorio'].includes(row.sessionType)) throw new BadRequestException('Seleccione TEORÍA o LABORATORIO según la programación.');
  return iso;
}

@Injectable()
export class AttendanceSessionsService implements OnModuleInit {
  constructor(@InjectConnection() private connection: Connection, @InjectModel(Attendance.name) private attendance: Model<AttendanceDocument>) {}
  async onModuleInit() { await this.attendance.createIndexes(); }
  private read(model: string) { return this.connection.model(model).find().lean().exec() as Promise<any[]>; }
  async resolveActor(user: { uid?: string; role?: string; email?: string; teacherDni?: string; dni?: string }): Promise<AttendanceActor> {
    if (!user?.uid) throw new ForbiddenException('Conecte su cuenta institucional para registrar asistencias.');
    const role = plain(user.role);
    if (['mge', 'administrador', 'superadmin', 'admin'].includes(role)) return { uid: user.uid, role: 'mge' };
    if (role !== 'docente') throw new ForbiddenException('Su cuenta no tiene permiso para gestionar asistencia.');
    const teachers = await this.read('AcademicTeacher');
    const claimedDni = user.teacherDni || user.dni;
    const matches = teachers.filter((teacher) => claimedDni ? teacher.dni === claimedDni : user.email && plain(teacher.email) === plain(user.email));
    if (matches.length !== 1 || plain(matches[0].status) === 'inactivo') throw new ForbiddenException('Su cuenta docente no está vinculada a una ficha docente activa en MPA.');
    return { uid: user.uid, role: 'docente', teacherDni: matches[0].dni };
  }
  private assigned(row: { teacherDni?: string }, actor: AttendanceActor) {
    if (!actor || (actor.role !== 'mge' && (actor.role !== 'docente' || !actor.teacherDni || row.teacherDni !== actor.teacherDni))) throw new ForbiddenException('No tiene asignada la sección seleccionada.');
  }
  async programming(actor?: AttendanceActor) {
    const [tasks, groups, courses, periods, schedules, shifts, careers, teachers, classrooms, enrollments, students, teachingCourses] = await Promise.all([
      'AcademicProgramming', 'AcademicGroup', 'AcademicCourse', 'AcademicPeriod', 'AcademicSchedule', 'AcademicShift', 'AcademicProgram', 'AcademicTeacher', 'Classroom', 'Enrollment', 'Student', 'Course',
    ].map((model) => this.read(model)));
    const active = new Set(students.filter((student) => student.active !== false).map((student) => student.dni));
    return tasks.filter((task) => !actor || actor.role === 'mge' || task.teacherDni === actor.teacherDni).map((task) => {
      const group = groups.find((row) => row.id === task.groupId);
      const course = courses.find((row) => row.id === task.courseId || row.code === task.courseId);
      const period = periods.find((row) => row.id === group?.periodId);
      const schedule = schedules.find((row) => row.id === task.scheduleId);
      const startTime = clockTime(task.startTime || schedule?.startTime), endTime = clockTime(task.endTime || schedule?.endTime);
      const dayOfWeek = task.dayOfWeek || schedule?.dayOfWeek || '';
      const issues: string[] = [];
      if (!group) issues.push('El grupo de esta programación no está disponible en MPA.');
      if (!course) issues.push('El curso de esta programación no está disponible en MPA.');
      if (group && course && group.careerId !== course.careerId) issues.push('La carrera del curso no coincide con la del grupo.');
      if (!period) issues.push('No hay un periodo válido para este grupo.');
      else if (period.status !== 'Activo' || period.isActive !== true) issues.push('El ciclo lectivo no está vigente.');
      if (!weekdays.includes(plain(dayOfWeek)) || !startTime || !endTime || startTime >= endTime) issues.push('El día o las horas de clase no están completos.');
      const members = enrollments.filter((enrollment) => group && enrollment.groupId === group.id && enrollment.programId === group.careerId && enrollment.academicStatus === 'MATRICULADO' && active.has(enrollment.studentDni));
      if (!members.length) issues.push('No hay estudiantes matriculados y activos asignados a este grupo.');
      const teacher = teachers.find((row) => row.dni === task.teacherDni);
      if (!teacher || plain(teacher.status) === 'inactivo') issues.push('La sección no tiene un docente activo asignado en MPA.');
      if (!['Teoría', 'Laboratorio'].includes(task.sessionType)) issues.push('Seleccione TEORÍA o LABORATORIO según la programación.');
      const teachingCourse = teachingCourses.find((item) => item.code === course?.code);
      return { id: task.id, courseId: teachingCourse ? String(teachingCourse.id || teachingCourse._id) : course?.id || task.courseId, courseName: course?.name || task.courseCode || task.courseId, courseCode: course?.code || task.courseCode || '',
        careerId: course?.careerId || group?.careerId || '', careerName: careers.find((row) => row.id === (course?.careerId || group?.careerId))?.name || '',
        groupId: task.groupId, groupName: group?.name || 'Grupo no disponible', periodId: group?.periodId || '', periodName: period?.name || 'Sin periodo asignado', periodStatus: period?.status || '', periodActive: period?.isActive === true, teacherDni: task.teacherDni,
        startDate: normalizeAttendanceDate(period?.startDate), endDate: normalizeAttendanceDate(period?.endDate), shift: shifts.find((row) => row.id === group?.shiftId)?.name || '',
        dayOfWeek, startTime, endTime, sessionType: task.sessionType, teacherName: teacher ? `${teacher.name} ${teacher.lastName || ''}`.trim() : task.teacherName || 'Docente sin ficha disponible',
        classroomName: classrooms.find((row) => row.id === task.classroomId)?.name || task.classroomName || 'Aula sin ficha disponible', rosterCount: members.length, issues };
    });
  }
  async list(actor: AttendanceActor) {
    const ids = (await this.programming(actor)).map((row) => row.id);
    return (await this.attendance.find({ programmingId: { $in: ids } }).sort({ date: -1, startTime: 1 }).lean().exec()).map(sessionPayload);
  }
  async create(body: { programmingId?: string; date?: string; extraordinary?: boolean; reason?: string }, actor: AttendanceActor) {
    const row = (await this.programming()).find((item) => item.id === body.programmingId);
    if (!row) throw new NotFoundException('No se encontró la programación de clase.');
    this.assigned(row, actor);
    if (row.issues.length) throw new BadRequestException(row.issues.join(' '));
    const date = validateSessionDate(body.date, row, body.extraordinary, body.reason);
    const existing = await this.attendance.findOne({ programmingId: row.id, date }).lean().exec();
    if (existing) return sessionPayload(existing);
    const enrollments = await this.connection.model('Enrollment').find({ groupId: row.groupId, programId: row.careerId, academicStatus: 'MATRICULADO' }).lean().exec() as any[];
    const students = await this.connection.model('Student').find({ dni: { $in: enrollments.map((item) => item.studentDni) }, active: { $ne: false } }).lean().exec() as any[];
    if (!students.length) throw new BadRequestException('El grupo no tiene alumnos matriculados activos.');
    const roster = students.map((student) => ({ dni: student.dni, name: student.name, lastName: student.lastName }));
    try {
      return sessionPayload(await new this.attendance({ programmingId: row.id, courseId: row.courseId, date, groupId: row.groupId, periodId: row.periodId, courseName: row.courseName, courseCode: row.courseCode,
        groupName: row.groupName, startTime: row.startTime, endTime: row.endTime, sessionType: row.sessionType, teacherName: row.teacherName, classroomName: row.classroomName,
        teacherDni: row.teacherDni, extraordinary: false, reason: '', roster, statusMap: {}, revision: 0 }).save());
    } catch (error) {
      if ((error as { code?: number }).code === 11000) return sessionPayload(await this.attendance.findOne({ programmingId: row.id, date }).lean().exec());
      throw error;
    }
  }
  async mark(id: string, statusMap: Record<string, string>, actor: AttendanceActor, revision: number) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Sesión inválida.');
    const session = await this.attendance.findOne({ _id: id, programmingId: { $type: 'string' } }).lean().exec();
    if (!session) throw new NotFoundException('No se encontró la sesión.');
    const row = (await this.programming()).find((item) => item.id === session.programmingId);
    if (!row) throw new BadRequestException('No se encontró la programación de clase.');
    this.assigned(row, actor);
    if (row.issues.length) throw new BadRequestException(row.issues.join(' '));
    validateSessionDate(session.date, row);
    if (session.groupId !== row.groupId || session.periodId !== row.periodId || session.sessionType !== row.sessionType) throw new ConflictException('La programación cambió. Actualice la sesión antes de registrar asistencia.');
    if (!statusMap || typeof statusMap !== 'object' || Array.isArray(statusMap)) throw new BadRequestException('Debe registrar la asistencia de todos los alumnos antes de guardar.');
    const roster = new Set(session.roster?.map((student) => student.dni));
    for (const [dni, mark] of Object.entries(statusMap)) {
      if (!/^\d{8}$/.test(dni) || !roster.has(dni) || !['Presente', 'Tardanza', 'Falta', 'Justificado'].includes(mark)) throw new BadRequestException('Alumno o estado no permitido para esta sesión.');
    }
    if (!roster.size || Object.keys(statusMap).length !== roster.size) throw new BadRequestException('Debe registrar la asistencia de todos los alumnos antes de guardar.');
    if (!Number.isInteger(revision) || revision < 0 || revision !== (session.revision || 0)) throw new ConflictException('La asistencia cambió. Actualice la sesión antes de guardar. Sus marcas no se han enviado.');
    const saved = await this.attendance.findOneAndUpdate({ _id: id, programmingId: session.programmingId, $or: revision === 0 ? [{ revision: 0 }, { revision: { $exists: false } }] : [{ revision }] },
      { $set: { statusMap, registeredAt: new Date(), lastSavedBy: actor.uid }, $inc: { revision: 1 } }, { returnDocument: 'after', runValidators: true }).lean().exec();
    if (!saved) throw new ConflictException('La asistencia cambió. Actualice la sesión antes de guardar.');
    return sessionPayload(saved);
  }
}
