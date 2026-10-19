import { academicAlertCandidates, AcademicAlertsService } from './academic-alerts.service';
import type { StudentRiskAssessment } from './analytics.service';

describe('Academic alerts based on actual indicators', () => {
  const student = (attendance: number | null, grade: number | null) => ({ studentDni: '12345678', studentName: 'Prueba', riskLevel: 'SIN_DATOS', metrics: { attendanceRate: attendance, currentGpa: grade } }) as StudentRiskAssessment;
  it('does not invent alerts for absent data or satisfactory recorded indicators', () => {
    expect(academicAlertCandidates([student(null, null), student(100, 18)])).toEqual([]);
  });
  it('can flag a recorded indicator without pretending that the full risk assessment is available', () => {
    expect(academicAlertCandidates([student(50, null)])).toMatchObject([{ kind: 'ASISTENCIA', value: 50, level: 'CRITICO' }]);
  });
  it('includes a real grade zero and respects existing risk boundaries', () => {
    expect(academicAlertCandidates([student(80, 0)])).toMatchObject([{ kind: 'ASISTENCIA', level: 'MODERADO' }, { kind: 'NOTAS', value: 0, level: 'CRITICO' }]);
    expect(academicAlertCandidates([student(82, 12.5)])).toEqual([]);
    expect(academicAlertCandidates([student(72, 10.5)])).toMatchObject([{ level: 'MODERADO' }, { level: 'MODERADO' }]);
  });
  it('does not modify notifications when academic data cannot be queried', async () => {
    const analytics = { calculateAttritionRisk: async () => { throw new Error('Unavailable'); } };
    const model = { updateOne: jest.fn(), findOneAndUpdate: jest.fn() };
    await expect(new AcademicAlertsService(analytics as never, model as never).refresh()).rejects.toThrow('Unavailable');
    expect(model.updateOne).not.toHaveBeenCalled(); expect(model.findOneAndUpdate).not.toHaveBeenCalled();
  });
});
