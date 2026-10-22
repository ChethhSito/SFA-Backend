import { BadRequestException } from '@nestjs/common';
import { CoursesService } from './courses.service';

describe('Attendance persistence', () => {
  function setup() {
    const response = { courseId: 'course-1', date: '2026-10-19', statusMap: { '12345678': 'Falta' } };
    const model = { findOneAndUpdate: jest.fn(() => ({ exec: async () => response })) };
    return { model, response, service: new CoursesService({} as never, model as never, {} as never, {} as never, {} as never, {} as never) };
  }
  it('updates only the marked student, with a canonical date and no replacement of the full map', async () => {
    const { model, service, response } = setup();
    expect(await service.saveAttendance('course-1', '19/10/2026', { '12345678': 'Falta' }, 3)).toBe(response);
    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      { courseId: 'course-1', date: { $in: ['2026-10-19', '19/10/2026'] } },
      { $set: { date: '2026-10-19', 'statusMap.12345678': 'Falta', week: 3 }, $setOnInsert: { courseId: 'course-1' } },
      expect.objectContaining({ upsert: true, returnDocument: 'after', setDefaultsOnInsert: false }),
    );
  });
  it.each([{}, { '12345678': 'Absent' }, { 'bad.key': 'Presente' }, { '12345678': null }, []])('rejects invalid or empty marks without writing: %j', async (marks) => {
    const { service, model } = setup();
    await expect(service.saveAttendance('course-1', '2026-10-19', marks as never)).rejects.toBeInstanceOf(BadRequestException);
    expect(model.findOneAndUpdate).not.toHaveBeenCalled();
  });
  it('rejects impossible dates without writing', async () => {
    const { service, model } = setup();
    await expect(service.saveAttendance('course-1', '2026-02-31', { '12345678': 'Presente' })).rejects.toBeInstanceOf(BadRequestException);
    expect(model.findOneAndUpdate).not.toHaveBeenCalled();
  });
  it('omits week metadata for MGE daily records instead of inventing week one', async () => {
    const { service, model } = setup();
    await service.saveAttendance('course-1', '2026-10-19', { '12345678': 'Justificado' });
    expect((model.findOneAndUpdate.mock.calls[0] as unknown as any[])[1].$set.week).toBeUndefined();
  });
});
