import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CoursesService } from './courses.service';

describe('Persisted assignment grades', () => {
  const setup = () => {
    const assignment = {
      courseId: 'course-1', title: 'Examen',
      submissions: [
        { studentDni: '11111111', studentName: 'Ana', fileName: 'entrega.pdf', submitDate: '2026-10-01', grade: 15 },
        { studentDni: '22222222', studentName: 'Luis', fileName: '', submitDate: '2026-10-01', grade: 13 },
      ],
      markModified: jest.fn(), save: jest.fn(),
    };
    assignment.save.mockImplementation(async () => assignment);
    const model = { findById: jest.fn(() => ({ exec: async () => assignment })) };
    const service = new CoursesService({} as never, {} as never, {} as never, model as never);
    return { assignment, model, service };
  };

  it('updates a recorded zero and keeps the submission and other students intact', async () => {
    const { service, assignment } = setup();
    await service.updateAssignment('id', { courseId: 'wrong-course', title: 'wrong-title', submissions: [{ studentDni: '11111111', grade: 0, feedback: 'Revisar' }] });
    expect(assignment.submissions).toEqual([
      expect.objectContaining({ studentDni: '11111111', grade: 0, fileName: 'entrega.pdf', submitDate: '2026-10-01', feedback: 'Revisar' }),
      expect.objectContaining({ studentDni: '22222222', grade: 13 }),
    ]);
    expect(assignment.courseId).toBe('course-1');
    expect(assignment.title).toBe('Examen');
    expect(assignment.save).toHaveBeenCalledTimes(1);
  });

  it.each([-1, 21, '14', null, NaN, Infinity])('rejects invalid grade %s without writing', async (grade) => {
    const { service, assignment } = setup();
    await expect(service.updateAssignment('id', { submissions: [{ studentDni: '11111111', grade }] })).rejects.toBeInstanceOf(BadRequestException);
    expect(assignment.save).not.toHaveBeenCalled();
  });

  it('rejects duplicate student entries before writing', async () => {
    const { service, assignment } = setup();
    await expect(service.updateAssignment('id', { submissions: [{ studentDni: '11111111', grade: 10 }, { studentDni: '11111111', grade: 15 }] })).rejects.toBeInstanceOf(BadRequestException);
    expect(assignment.save).not.toHaveBeenCalled();
  });

  it('does not create an evaluation implicitly when an update ID is missing', async () => {
    const { service, model } = setup();
    model.findById.mockReturnValue({ exec: async () => null as never });
    await expect(service.updateAssignment('missing', { submissions: [] })).rejects.toBeInstanceOf(NotFoundException);
  });
});
