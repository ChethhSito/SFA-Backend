import { AnalyticsService } from './analytics.service';

describe('Academic risk from persisted evidence', () => {
  const student = { dni: '12345678', name: 'Ana', lastName: 'Perez', cycleStatuses: [] };
  const enrollment = { studentDni: student.dni, programId: 'sistemas', shift: 'Noche', paymentStatus: 'Validado' };
  const model = (rows: unknown[]) => ({ find: () => ({ lean: () => ({ exec: async () => rows }) }) });
  const submission = (grade?: number) => ({ studentDni: student.dni, fileName: 'entrega.pdf', submitDate: '2020-01-01', grade });
  const task = (courseId: string, submissions: unknown[] = [], dueDate = '2020-01-01') =>
    ({ courseId, dueDate, description: 'Practica', submissions });
  const session = (status: string, date = '2020-01-01') => ({ courseId: 'course-1', date, statusMap: { [student.dni]: status } });
  function service(attendance: unknown[] = [], assignments: unknown[] = [], enrollments: unknown[] = [enrollment], students: unknown[] = [student]) {
    return new AnalyticsService(model(students) as never, model(enrollments) as never,
      model(attendance) as never, model(assignments) as never,
      model([{ id: 'sistemas', name: 'Desarrollo de Sistemas' }]) as never, model([]) as never);
  }

  it('does not invent metrics or a favorable score for a student with no records', async () => {
    const report = await service().calculateAttritionRisk();
    expect(report.students[0]).toMatchObject({ riskScore: null, riskLevel: 'SIN_DATOS',
      career: 'Desarrollo de Sistemas', cycle: 'Sin ciclo registrado',
      metrics: { attendanceRate: null, currentGpa: null, homeworkCompletion: null, hasOverduePayment: null } });
    expect(report.kpis).toMatchObject({ totalStudents: 1, totalEvaluated: 0, insufficientDataCount: 1, retentionRate: null, lowRiskCount: 0 });
  });

  it('excludes deactivated students from the active risk assessment', async () => {
    const report = await service([], [], [], [{ ...student, active: false }]).calculateAttritionRisk();
    expect(report.students).toEqual([]);
    expect(report.kpis.totalStudents).toBe(0);
  });

  it('uses recorded attendance, real zero grades, and only due tasks of observed classrooms', async () => {
    const report = await service(
      [session('Presente'), session('Tardanza', '2020-01-02'), session('Justificado', '2020-01-03'), session('Falta', '2020-01-04'),
        session('Falta', '2999-01-01'), { courseId: 'other', date: '2020-01-01', statusMap: {} }],
      [task('course-1', [submission(0)]), task('course-1'), task('other'), task('course-1', [], '2999-01-01')],
    ).calculateAttritionRisk();
    expect(report.students[0]).toMatchObject({ riskLevel: 'CRITICO',
      metrics: { attendanceRate: 75, currentGpa: 0, homeworkCompletion: 50 } });
    expect(report.kpis.totalEvaluated).toBe(1);
  });

  it('does not turn an ungraded submission or default cycle zeros into grades', async () => {
    const report = await service([session('Presente')], [task('course-1', [submission()])], [enrollment],
      [{ ...student, cycleStatuses: [{ year: 2026, cycleNumber: 1, average: 0, courses: [{ grade: 0 }] }] }]).calculateAttritionRisk();
    expect(report.students[0].metrics.currentGpa).toBeNull();
    expect(report.students[0].riskLevel).toBe('SIN_DATOS');
  });

  it('does not assume a career, shift, or overdue payment when enrollment data is missing', async () => {
    const report = await service([session('Presente')], [task('course-1', [submission(18)])], []).calculateAttritionRisk();
    expect(report.students[0]).toMatchObject({ career: 'Sin carrera registrada', shift: 'Sin turno registrado', riskLevel: 'SIN_DATOS' });
  });

  it('returns no projected rate for an empty database', async () => {
    const report = await service([], [], [], []).calculateAttritionRisk();
    expect(report.students).toEqual([]);
    expect(report.kpis).toMatchObject({ totalStudents: 0, totalEvaluated: 0, retentionRate: null });
  });

  it('propagates a database error rather than returning a simulated successful report', async () => {
    const instance = service();
    (instance as any).attendanceModel = { find: () => { throw new Error('Database unavailable'); } };
    await expect(instance.calculateAttritionRisk()).rejects.toThrow('Database unavailable');
  });

  it('excludes administrative grade records from homework obligations', async () => {
    const report = await service([session('Presente')], [{ ...task('course-1', [submission(18)]),
      description: 'Registro de notas consolidado por administración' }]).calculateAttritionRisk();
    expect(report.students[0].metrics.currentGpa).toBe(18);
    expect(report.students[0].metrics.homeworkCompletion).toBeNull();
    expect(report.students[0].riskLevel).toBe('SIN_DATOS');
  });

  it('uses an assessment grade without treating that assessment as overdue homework', async () => {
    const report = await service([session('Presente')], [{ ...task('course-1', [submission(0)]), kind: 'assessment' }]).calculateAttritionRisk();
    expect(report.students[0].metrics.currentGpa).toBe(0);
    expect(report.students[0].metrics.homeworkCompletion).toBeNull();
  });

  it('normalizes historical dates and counts each course/day once, without imputing missing students', async () => {
    const report = await service([
      { ...session('Presente', '01/01/2020'), updatedAt: '2020-01-01' },
      { ...session('Falta'), updatedAt: '2020-01-02' },
      session('Presente', '2020-01-02'),
      { courseId: 'course-1', date: '2020-01-03', statusMap: { '87654321': 'Falta' } },
      session('Falta', '2999-01-01'), session('Falta', 'not-a-date'),
    ]).calculateAttritionRisk();
    expect(report.students[0].metrics.attendanceRate).toBe(50);
  });
});
