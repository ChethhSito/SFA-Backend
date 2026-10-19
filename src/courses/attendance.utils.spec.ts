import { mergeAttendanceRecords, normalizeAttendanceDate } from './attendance.utils';

describe('Daily attendance records', () => {
  it.each([['19/10/2026', '2026-10-19'], ['2026-10-19', '2026-10-19'], ['2024-02-29', '2024-02-29']])('normalizes %s', (input, expected) => {
    expect(normalizeAttendanceDate(input)).toBe(expected);
  });
  it.each(['2026-02-29', '2026-02-31', '2026-13-01', '2026-1-1', '', null, '20/40/2026'])('rejects invalid date %s', (input) => {
    expect(normalizeAttendanceDate(input)).toBeNull();
  });
  it('merges historical duplicate days, preserving students and the most recent correction', () => {
    const records = mergeAttendanceRecords([
      { courseId: 'c1', date: '19/10/2026', updatedAt: '2026-10-19T10:00:00Z', statusMap: { '11111111': 'Presente', '22222222': 'Tardanza' } },
      { courseId: 'c1', date: '2026-10-19', updatedAt: '2026-10-19T11:00:00Z', statusMap: { '11111111': 'Justificado' } },
      { courseId: 'c2', date: '2026-10-19', updatedAt: '2026-10-19T11:00:00Z', statusMap: { '11111111': 'Falta' } },
    ]);
    expect(records).toHaveLength(2);
    expect(records[0].statusMap).toEqual({ '11111111': 'Justificado', '22222222': 'Tardanza' });
    expect(records[0].date).toBe('2026-10-19');
  });
});
