import { BadRequestException } from '@nestjs/common';
import { MpaService } from './mpa.service';

describe('MpaService programming rules', () => {
  const groups = [{ id: 'g1', periodId: '2026-I' }, { id: 'g2', periodId: '2026-I' }, { id: 'g3', periodId: '2026-II' }];
  class FakeModel {
    constructor(data: Record<string, unknown>) { Object.assign(this, data); }
    validate() { return Promise.resolve(); }
    static find() { return { lean: () => ({ exec: async () => groups }) }; }
    static bulkWrite() { return Promise.resolve(); }
    static deleteMany() { return { exec: async () => ({}) }; }
  }
  const connection = { model: () => FakeModel };
  const service = new MpaService(connection as never);
  const task = (id: string, groupId: string) => ({ id, groupId, courseId: 'c1', teacherDni: '12345678', classroomId: 'a1', sessionType: 'Teoría', dayOfWeek: 'Lunes', startTime: '08:00 AM', endTime: '09:00 AM', pedagogicalHours: 1 });

  it('rejects the same teacher or classroom at overlapping hours in one period', async () => {
    await expect(service.save('tasks', [task('t1', 'g1'), task('t2', 'g2')])).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows the same resources in different academic periods', async () => {
    await expect(service.save('tasks', [task('t1', 'g1'), task('t2', 'g3')])).resolves.toHaveLength(2);
  });

  it('rejects a session whose group does not exist', async () => {
    await expect(service.save('tasks', [task('t1', 'missing')])).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('MpaService academic period rules', () => {
  class FakeModel {
    constructor(data: Record<string, unknown>) { Object.assign(this, data); }
    validate() { return Promise.resolve(); }
    static find() { return { lean: () => ({ exec: async () => [] }) }; }
    static findOne() { return { lean: () => ({ exec: async () => null }) }; }
    static updateMany() { return { exec: async () => ({}) }; }
    static bulkWrite() { return Promise.resolve(); }
    static deleteMany() { return { exec: async () => ({}) }; }
  }
  const period = (id: string, status: 'Activo' | 'Planificación' | 'Cerrado') => ({
    id, name: `Periodo ${id}`, startDate: '2026-11-01', endDate: '2027-02-01',
    status, isActive: status === 'Activo',
  });

  it('rejects two active academic periods in a direct API save', async () => {
    const connection = { model: () => FakeModel };
    const service = new MpaService(connection as never);
    await expect(service.save('periods', [period('1', 'Activo'), period('2', 'Activo')]))
      .rejects.toThrow('Solo puede existir un período académico activo');
  });

  it('rejects closing an academic period while its admission is open', async () => {
    const connection = {
      model: () => FakeModel,
      collection: () => ({ findOne: async () => ({ id: 'admission-1' }) }),
    };
    const service = new MpaService(connection as never);
    await expect(service.save('periods', [period('1', 'Cerrado')]))
      .rejects.toThrow('Cierre la convocatoria de admisión');
  });
});
