// Run after npm run build. Never writes to academic collections.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const dns = require('node:dns');
const mongoose = require('mongoose');
const { AnalyticsService } = require('../dist/analytics/analytics.service');
const { TutoringReferralSchema } = require('../dist/analytics/schemas/tutoring-referral.schema');

async function main() {
  process.loadEnvFile('.env');
  dns.setServers(['8.8.8.8', '1.1.1.1']);
  const collectionName = `codex_tutoring_test_${randomUUID().replaceAll('-', '')}`;
  const connection = await mongoose.createConnection(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sfa_database', {
    serverSelectionTimeoutMS: 15000,
  }).asPromise();
  const model = connection.model('TutoringIntegration', TutoringReferralSchema, collectionName);
  let created = false;
  const student = { dni: '12345678', name: 'Prueba', lastName: 'Temporal', cycleStatuses: [] };
  const query = (result) => ({ lean: () => ({ exec: async () => result }) });
  const fixture = (rows) => ({ find: () => query(rows) });
  const students = { ...fixture([student]), findOne: () => query(student) };
  const service = () => new AnalyticsService(students, fixture([]), fixture([]), fixture([]), fixture([]), model);
  try {
    await model.createCollection();
    created = true;
    await model.init();
    const results = await Promise.all([
      service().referStudentToTutoring(student.dni, 'Seguimiento de prueba'),
      service().referStudentToTutoring(student.dni, 'Seguimiento de prueba'),
    ]);
    assert.ok(results.every((result) => result.success));
    assert.equal(await model.countDocuments(), 1);
    const restarted = service();
    const inbox = await restarted.listTutoringReferrals();
    assert.equal(inbox.length, 1);
    assert.equal(inbox[0].reason, 'Seguimiento de prueba');
    assert.equal(inbox[0].readAt, null);
    assert.equal((await restarted.calculateAttritionRisk()).students[0].referredToTutoring, true);
    const read = await restarted.markTutoringReferralRead(student.dni);
    assert.ok(read.readAt instanceof Date);
    const reopened = service();
    assert.equal((await reopened.listTutoringReferrals())[0].readAt.toISOString(), read.readAt.toISOString());
    await reopened.referStudentToTutoring(student.dni, 'Un reintento no reemplaza el motivo original');
    const final = await reopened.listTutoringReferrals();
    assert.equal(final.length, 1);
    assert.equal(final[0].reason, 'Seguimiento de prueba');
    assert.equal(final[0].readAt.toISOString(), read.readAt.toISOString());
    console.log('MongoDB tutoring: concurrent deduplication, persistence across service instances, report flag and read status passed.');
  } finally {
    try {
      if (created) {
        if (!collectionName.startsWith('codex_tutoring_test_') || model.collection.name !== collectionName) throw new Error('Unexpected cleanup target.');
        await model.collection.drop();
        console.log('Temporary tutoring test collection removed.');
      }
    } finally { await connection.close(); }
  }
}

main().catch((error) => {
  console.error('Tutoring integration failed:', error.name, error.code || '', error.message?.replace(/mongodb[^\s]*/g, '[connection]'));
  process.exitCode = 1;
});
