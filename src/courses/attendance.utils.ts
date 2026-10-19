/** Normalize historical dd/MM/yyyy dates and validate actual calendar days. */
export function normalizeAttendanceDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const legacy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  const iso = legacy ? `${legacy[3]}-${legacy[2]}-${legacy[1]}` : value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const parsed = new Date(`${iso}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === iso ? iso : null;
}

type AttendanceRow = { courseId: string; date: string; statusMap: Record<string, string>; updatedAt?: unknown };

/** A daily record is identified by course and date, not by a browser-generated ID. */
export function mergeAttendanceRecords<T extends AttendanceRow>(rows: T[]): T[] {
  const days = new Map<string, T>();
  const sorted = [...rows].sort((a, b) =>
    (new Date(String(a.updatedAt || '')).getTime() || 0) - (new Date(String(b.updatedAt || '')).getTime() || 0));
  for (const row of sorted) {
    const date = normalizeAttendanceDate(row.date) || row.date;
    const key = JSON.stringify([row.courseId, date]);
    const previous = days.get(key);
    days.set(key, { ...row, date, statusMap: { ...previous?.statusMap, ...row.statusMap } });
  }
  return [...days.values()];
}
