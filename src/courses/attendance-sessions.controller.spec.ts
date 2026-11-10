import { GoneException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AttendanceSessionsController } from './attendance-sessions.controller';
import { CoursesController } from './courses.controller';
jest.mock('../auth/auth.service', () => ({ AuthService: class {} }));

describe('Attendance entry point protection', () => {
  it('requires Firebase verification on all programmed-session endpoints', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, AttendanceSessionsController)).toContain(AuthGuard);
  });
  it('rejects absent credentials and attaches only claims verified by Firebase', async () => {
    const auth = { verifyIdToken: jest.fn(async () => ({ uid: 'verified', role: 'docente' })) };
    const guard = new AuthGuard(auth as never);
    const request: any = { headers: { 'x-user-role': 'mge' } };
    const context = { switchToHttp: () => ({ getRequest: () => request }) } as any;
    await expect(guard.canActivate(context)).rejects.toThrow('Missing or invalid Authorization');
    request.headers.authorization = 'Bearer valid-token';
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({ uid: 'verified', role: 'docente' });
    expect(auth.verifyIdToken).toHaveBeenCalledWith('valid-token');
  });
  it('uses the verified request identity rather than a DNI or role submitted in the body', async () => {
    const actor = { uid: 'verified', role: 'docente', teacherDni: '11111111' };
    const service = { resolveActor: jest.fn(async () => actor), mark: jest.fn(async () => ({})) };
    const controller = new AttendanceSessionsController(service as never);
    await controller.mark({ user: { uid: 'verified' } }, 'id', { statusMap: { '12345678': 'Presente' }, revision: 2, teacherDni: 'forged', role: 'mge' } as any);
    expect(service.resolveActor).toHaveBeenCalledWith({ uid: 'verified' });
    expect(service.mark).toHaveBeenCalledWith('id', { '12345678': 'Presente' }, actor, 2);
  });
  it('closes the legacy write route so it cannot bypass scheduling or complete-roster checks', () => {
    const service = { saveAttendance: jest.fn() };
    expect(() => new CoursesController(service as never).saveAttendance('course', { date: '2026-10-27', statusMap: { '12345678': 'Falta' } })).toThrow(GoneException);
    expect(service.saveAttendance).not.toHaveBeenCalled();
  });
});
