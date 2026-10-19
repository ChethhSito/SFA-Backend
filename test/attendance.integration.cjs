// Run after npm run build. Uses an isolated, randomly named collection only.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const dns = require('node:dns');
const mongoose = require('mongoose');
const { CoursesService } = require('../dist/courses/courses.service');
const { AnalyticsService } = require('../dist/analytics/analytics.service');
const { AttendanceSchema } = require('../dist/courses/schemas/attendance.schema');

async function main() {
  process.loadEnvFile('.env');
  dns.setServers(['8.8.8.8', '1.1.1.1']);
  const collectionName = `codex_attendance_test_${randomUUID().replaceAll('-', '')}`;
  const connection = await mongoose.createConnection(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sfa_database', {
    serverSelectionTimeoutMS: 15000,
  }).asPromise();
  const model = connection.model('AttendanceIntegration', AttendanceSchema, collectionName);
  let created = false;
  try {
    await model.createCollection();
    created = true;
    const service = new CoursesService({}, model, {}, {});
    await service.saveAttendance('course-test', '2026-10-18', { '12345678': 'Presente', '87654321': 'Tardanza' }, 3);
    await service.saveAttendance('course-test', '2026-10-18', { '12345678': 'Falta' });
    let records = await service.getAttendance('course-test');
    assert.equal(records.length, 1);
    assert.deepEqual(records[0].statusMap, { '12345678': 'Falta', '87654321': 'Tardanza' });
    assert.equal(records[0].week, 3);
    await model.create({ courseId: 'course-legacy', date: '17/10/2026', statusMap: { '12345678': 'Falta' } });
    await service.saveAttendance('course-legacy', '2026-10-17', { '12345678': 'Presente' });
    records = await service.getAttendance('course-legacy');
    assert.equal(records.length, 1);
    assert.equal(records[0].date, '2026-10-17');
    assert.equal(await model.countDocuments({ courseId: 'course-legacy' }), 1);
    const fixture = (rows) => ({ find: () => ({ lean: () => ({ exec: async () => rows }) }) });
    const report = await new AnalyticsService(
      fixture([{ dni: '12345678', name: 'Prueba', lastName: 'Temporal', cycleStatuses: [] }]),
      fixture([{ studentDni: '12345678', programId: 'test', shift: 'Mañana', paymentStatus: 'Validado' }]),
      model, fixture([]), fixture([]), fixture([]),
    ).calculateAttritionRisk();
    assert.equal(report.students[0].metrics.attendanceRate, 50);
    console.log('MongoDB integration: daily correction, preservation of other students, historical date normalization and analytics passed.');
  } finally {
    if (created) {
      if (!collectionName.startsWith('codex_attendance_test_') || model.collection.name !== collectionName) throw new Error('Unexpected test collection; cleanup refused.');
      await model.collection.drop();
      console.log('Temporary test collection removed.');
    }
    await connection.close();
  }
}

main().catch((error) => {
  console.error('Attendance integration failed:', error.name, error.code || '');
  process.exitCode = 1;
});
