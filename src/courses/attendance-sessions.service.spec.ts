import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { AttendanceSessionsService, clockTime, validateSessionDate, sessionPayload, attendanceToday } from './attendance-sessions.service';
import { mergeAttendanceRecords } from './attendance.utils';
const id = '123456789012345678901234';
const query = (value: any) => ({ lean: () => query(value), exec: async () => value });
function setup() {
  const data: Record<string, any[]> = {
    AcademicProgramming: [{ id: 'task-1', courseId: 'c1', groupId: 'g1', dayOfWeek: 'Jueves', startTime: '08:00 AM', endTime: '10:15 AM', sessionType: 'Teoría', teacherDni: '11111111', classroomId: 'room1' }],
    AcademicGroup: [{ id: 'g1', name: 'Grupo A', periodId: 'p1', careerId: 'cont', shiftId: 'm' }],
    AcademicCourse: [{ id: 'c1', code: 'C-101', name: 'Curso', careerId: 'cont' }],
    AcademicPeriod: [{ id: 'p1', name: 'Periodo', startDate: '2026-10-01', endDate: '2026-12-31', status: 'Activo', isActive: true }],
    AcademicSchedule: [], AcademicShift: [{ id: 'm', name: 'Mañana' }], AcademicProgram: [{ id: 'cont', name: 'Contabilidad' }],
    AcademicTeacher: [{ dni: '11111111', name: 'Docente', lastName: 'Uno' }], Classroom: [{ id: 'room1', name: 'Aula 1' }],
    Course: [{ _id: 'canonical-course', code: 'C-101' }],
    Enrollment: [
      { studentDni: '12345678', groupId: 'g1', programId: 'cont', academicStatus: 'MATRICULADO' },
      { studentDni: '87654321', groupId: 'g2', programId: 'cont', academicStatus: 'MATRICULADO' },
      { studentDni: '11112222', groupId: 'g1', programId: 'cont', academicStatus: 'MATRICULADO' },
    ],
    Student: [{ dni: '12345678', name: 'Ana', lastName: 'Uno', active: true }, { dni: '87654321', name: 'Luis', active: true }, { dni: '11112222', active: false }],
  };
  const models = Object.fromEntries(Object.keys(data).map((name) => [name, { find: jest.fn((filter?: any) => query(data[name].filter((row) => !filter || Object.entries(filter).every(([key, value]: any) => value?.$in ? value.$in.includes(row[key]) : value?.$ne !== undefined ? row[key] !== value.$ne : row[key] === value)))) }]));
  const sessionModel: any = jest.fn().mockImplementation((row) => ({ save: async () => ({ ...row, _id: id }) }));
  sessionModel.findOne = jest.fn(() => query(null));
  sessionModel.findOneAndUpdate = jest.fn(() => query({ _id: id, statusMap: { '12345678': 'Presente' } }));
  const service = new AttendanceSessionsService({ model: (name: string) => models[name] } as never, sessionModel);
  return { data, models, sessionModel, service };
}

const manager = { uid: 'mge-uid', role: 'mge' as const };
const teacher = { uid: 'teacher-uid', role: 'docente' as const, teacherDni: '11111111' };
const savedSession = { programmingId: 'task-1', groupId: 'g1', periodId: 'p1', sessionType: 'Teoría', date: '2026-10-29', revision: 0, roster: [{ dni: '12345678' }], statusMap: {} };
describe('ECUS 018 attendance sessions', () => {
  beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(new Date('2026-10-29T15:00:00Z')); });
  afterEach(() => jest.useRealTimers());
  it('opens the correct group roster and keeps an empty session until complete registration', async () => {
    const { service, sessionModel } = setup();
    expect(await service.create({ programmingId: 'task-1', date: '2026-10-29' }, teacher)).toMatchObject({ programmingId: 'task-1', teacherDni: teacher.teacherDni, courseId: 'canonical-course', groupId: 'g1', date: '2026-10-29', sessionType: 'Teoría', statusMap: {}, revision: 0, roster: [{ dni: '12345678', name: 'Ana', lastName: 'Uno' }] });
    expect(sessionModel).toHaveBeenCalledTimes(1);
  });
  it('opens the existing session without duplicating its programming and date', async () => {
    const { service, sessionModel } = setup(); sessionModel.findOne.mockReturnValue(query({ _id: id }));
    expect(await service.create({ programmingId: 'task-1', date: '2026-10-29' }, manager)).toEqual({ _id: id, statusMap: {}, roster: [] });
    expect(sessionModel).not.toHaveBeenCalled();
  });
  it.each(['2026-10-22', '2026-10-30', '2026-02-31', '2027-01-07'])('rejects a day other than today or invalid: %s', async (date) => {
    const { service, sessionModel } = setup();
    await expect(service.create({ programmingId: 'task-1', date }, manager)).rejects.toBeInstanceOf(BadRequestException);
    expect(sessionModel).not.toHaveBeenCalled();
  });
  it('rejects the wrong weekday with the literal ECUS exception and no extraordinary bypass', async () => {
    const { service, data } = setup(); data.AcademicProgramming[0].dayOfWeek = 'Viernes';
    await expect(service.create({ programmingId: 'task-1', date: '2026-10-29' }, manager)).rejects.toThrow('La sección seleccionada no se encuentra programada para el día de hoy.');
    await expect(service.create({ programmingId: 'task-1', date: '2026-10-29', extraordinary: true, reason: 'Bypass' }, manager)).rejects.toBeInstanceOf(BadRequestException);
  });
  it.each(['group', 'periodClosed', 'periodInactive', 'periodPlanning', 'career', 'members', 'sessionType'])('blocks incomplete programming: %s', async (mode) => {
    const { service, data, sessionModel } = setup();
    if (mode === 'group') data.AcademicGroup.length = 0;
    if (mode === 'periodClosed') data.AcademicPeriod[0].status = 'Cerrado';
    if (mode === 'periodInactive') data.AcademicPeriod[0].isActive = false;
    if (mode === 'periodPlanning') data.AcademicPeriod[0].status = 'Planificación';
    if (mode === 'career') data.AcademicGroup[0].careerId = 'other';
    if (mode === 'members') data.Enrollment.forEach((row) => { delete row.groupId; });
    if (mode === 'sessionType') data.AcademicProgramming[0].sessionType = 'Otro';
    await expect(service.create({ programmingId: 'task-1', date: '2026-10-29' }, manager)).rejects.toBeInstanceOf(BadRequestException);
    expect(sessionModel).not.toHaveBeenCalled();
  });
  it('rejects an unassigned teacher even if the body pretends to contain the assigned DNI', async () => {
    const { service, sessionModel } = setup();
    await expect(service.create({ programmingId: 'task-1', date: '2026-10-29', teacherDni: '11111111' } as any, { ...teacher, teacherDni: '22222222' })).rejects.toThrow('No tiene asignada la sección seleccionada.');
    expect(sessionModel).not.toHaveBeenCalled();
  });
  it('binds a verified role and DNI to an active MPA teacher; rejects missing, ambiguous or unauthorized identities', async () => {
    const { service, data } = setup();
    expect(await service.resolveActor({ uid: 'teacher', role: 'docente', teacherDni: '11111111' })).toEqual({ uid: 'teacher', role: 'docente', teacherDni: '11111111' });
    await expect(service.resolveActor({ uid: 'student', role: 'alumno', dni: '11111111' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.resolveActor({ role: 'mge' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.resolveActor({ uid: 'teacher', role: 'docente', teacherDni: '99999999' })).rejects.toBeInstanceOf(ForbiddenException);
    data.AcademicTeacher[0].status = 'Inactivo';
    await expect(service.resolveActor({ uid: 'teacher', role: 'docente', teacherDni: '11111111' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(await service.programming({ ...teacher, teacherDni: '22222222' })).toEqual([]);
  });
  it('validates the complete roster before any write and rejects foreign students and invalid states', async () => {
    const { service, sessionModel } = setup();
    sessionModel.findOne.mockReturnValue(query({ ...savedSession, roster: [{ dni: '12345678' }, { dni: '12345679' }] }));
    await expect(service.mark(id, { '12345678': 'Presente' }, teacher, 0)).rejects.toThrow('Debe registrar la asistencia de todos los alumnos antes de guardar.');
    for (const marks of [{ '87654321': 'Falta' }, { '12345678': 'Desconocido' }]) await expect(service.mark(id, marks, manager, 0)).rejects.toBeInstanceOf(BadRequestException);
    expect(sessionModel.findOneAndUpdate).not.toHaveBeenCalled();
  });
  it('revalidates assignment, date and period on save, even for an already opened session', async () => {
    const { service, sessionModel, data } = setup(); sessionModel.findOne.mockReturnValue(query(savedSession));
    await expect(service.mark(id, { '12345678': 'Presente' }, { ...teacher, teacherDni: '22222222' }, 0)).rejects.toBeInstanceOf(ForbiddenException);
    data.AcademicPeriod[0].isActive = false;
    await expect(service.mark(id, { '12345678': 'Presente' }, manager, 0)).rejects.toBeInstanceOf(BadRequestException);
    data.AcademicPeriod[0].isActive = true; jest.setSystemTime(new Date('2026-10-30T15:00:00Z'));
    await expect(service.mark(id, { '12345678': 'Presente' }, manager, 0)).rejects.toBeInstanceOf(BadRequestException);
    expect(sessionModel.findOneAndUpdate).not.toHaveBeenCalled();
  });
  it('saves all marks atomically with revision and author without replacing metadata or another session', async () => {
    const { service, sessionModel } = setup(); sessionModel.findOne.mockReturnValue(query(savedSession));
    await service.mark(id, { '12345678': 'Justificado' }, teacher, 0);
    expect(sessionModel.findOneAndUpdate).toHaveBeenCalledWith(expect.objectContaining({ _id: id, programmingId: 'task-1', $or: [{ revision: 0 }, { revision: { $exists: false } }] }), { $set: { statusMap: { '12345678': 'Justificado' }, registeredAt: expect.any(Date), lastSavedBy: teacher.uid }, $inc: { revision: 1 } }, expect.objectContaining({ returnDocument: 'after' }));
  });
  it('detects an obsolete revision or a concurrent write and does not report false success', async () => {
    const { service, sessionModel } = setup(); sessionModel.findOne.mockReturnValue(query({ ...savedSession, revision: 1 }));
    await expect(service.mark(id, { '12345678': 'Presente' }, manager, 0)).rejects.toBeInstanceOf(ConflictException);
    expect(sessionModel.findOneAndUpdate).not.toHaveBeenCalled();
    sessionModel.findOneAndUpdate.mockReturnValue(query(null));
    await expect(service.mark(id, { '12345678': 'Presente' }, manager, 1)).rejects.toBeInstanceOf(ConflictException);
  });
  it('keeps theory, laboratory and legacy entries distinct, normalizes empty maps and validates times', () => {
    const rows = ['t1','t2'].map((programmingId) => ({ courseId: 'c1', date: '2026-10-29', programmingId, statusMap: { '12345678': 'Presente' } }));
    expect(mergeAttendanceRecords([...rows, { courseId: 'c1', date: '2026-10-29', programmingId: undefined, statusMap: {} }])).toHaveLength(3);
    expect(sessionPayload({ _id: id })).toEqual({ _id: id, roster: [], statusMap: {} });
    expect(clockTime('12:00 AM')).toBe('00:00'); expect(clockTime('01:30 PM')).toBe('13:30'); expect(clockTime('25:00')).toBeNull();
    expect(attendanceToday(new Date('2026-10-30T03:00:00Z'))).toBe('2026-10-29');
    expect(() => validateSessionDate('2026-10-29', {}, 'true', '')).toThrow(BadRequestException);
  });
});
