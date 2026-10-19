import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StudentsService } from './students.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';

describe('Reversible student deactivation', () => {
  const query = (value: unknown) => ({ exec: async () => value });
  it('changes only lifecycle fields, keeping enrollment and academic records intact', async () => {
    const updated = { dni: '12345678', active: false, cycleStatuses: [{ courses: [{ name: 'Curso', grade: 0 }] }] };
    const model = { findOneAndUpdate: jest.fn(() => query(updated)) };
    expect(await new StudentsService(model as never).setActive('12345678', false, ' Retiro voluntario ')).toBe(updated);
    expect(model.findOneAndUpdate).toHaveBeenCalledWith({ dni: '12345678', active: { $ne: false } },
      { $set: { active: false, deactivatedAt: expect.any(Date), deactivationReason: 'Retiro voluntario' } },
      { returnDocument: 'after', runValidators: true });
  });
  it('requires a valid DNI, a boolean state and a bounded reason', async () => {
    const model = { findOneAndUpdate: jest.fn() };
    const service = new StudentsService(model as never);
    for (const [dni, active, reason] of [['bad', false, 'motivo'], ['12345678', 'false', 'motivo'], ['12345678', false, ' '], ['12345678', false, 'x'.repeat(1001)]]) {
      await expect(service.setActive(dni as string, active as boolean, reason as string)).rejects.toBeInstanceOf(BadRequestException);
    }
    expect(model.findOneAndUpdate).not.toHaveBeenCalled();
  });
  it('reactivates without erasing the prior deactivation reason or dates', async () => {
    const model = { findOneAndUpdate: jest.fn(() => query({ active: true })) };
    await new StudentsService(model as never).setActive('12345678', true);
    expect(model.findOneAndUpdate).toHaveBeenCalledWith({ dni: '12345678', active: false },
      { $set: { active: true, reactivatedAt: expect.any(Date) } }, expect.anything());
  });
  it('returns the existing record on repeated requests without changing its original timestamp', async () => {
    const existing = { dni: '12345678', active: false, deactivationReason: 'Motivo original' };
    const model = { findOneAndUpdate: () => query(null), findOne: () => query(existing) };
    expect(await new StudentsService(model as never).setActive('12345678', false, 'Reintento')).toEqual(existing);
  });
  it('rejects unknown students without creating one', async () => {
    const model = { findOneAndUpdate: () => query(null), findOne: () => query(null) };
    await expect(new StudentsService(model as never).setActive('12345678', true)).rejects.toBeInstanceOf(NotFoundException);
  });
  it('propagates database failures', async () => {
    const model = { findOneAndUpdate: () => ({ exec: async () => { throw new Error('Offline'); } }) };
    await expect(new StudentsService(model as never).setActive('12345678', false, 'Motivo')).rejects.toThrow('Offline');
  });
  it('blocks enrolling a deactivated student through the API', async () => {
    const enrollment = { findOneAndUpdate: jest.fn() };
    const students = { findOne: () => query({ active: false }) };
    const service = new EnrollmentsService(enrollment as never, students as never);
    await expect(service.update('12345678', { academicStatus: 'MATRICULADO' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.create({ studentDni: '12345678' })).rejects.toBeInstanceOf(BadRequestException);
    expect(enrollment.findOneAndUpdate).not.toHaveBeenCalled();
  });
});
