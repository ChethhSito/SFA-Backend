// Real MongoDB tests isolated from academic collections.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { createHash } = require('node:crypto');
const dns = require('node:dns');
const mongoose = require('mongoose');
const { PDFDocument } = require('pdf-lib');
const { AnalyticsService } = require('../dist/analytics/analytics.service');
const { AcademicAlertsService } = require('../dist/analytics/academic-alerts.service');
const { CertificatesService } = require('../dist/graduations/certificates.service');
const { StudentSchema } = require('../dist/students/schemas/student.schema');
const { GraduationSchema } = require('../dist/graduations/schemas/graduation.schema');
const { TutoringReferralSchema } = require('../dist/analytics/schemas/tutoring-referral.schema');
const { AcademicAlertSchema } = require('../dist/analytics/schemas/academic-alert.schema');
const { IssuedCertificateSchema } = require('../dist/graduations/schemas/issued-certificate.schema');

async function main() {
  process.loadEnvFile('.env'); dns.setServers(['8.8.8.8', '1.1.1.1']);
  const prefix = `codex_followup_test_${randomUUID().replaceAll('-', '')}`;
  const connection = await mongoose.createConnection(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sfa_database', { serverSelectionTimeoutMS: 15000 }).asPromise();
  const models = [
    connection.model('FollowupStudent', StudentSchema, `${prefix}_students`),
    connection.model('FollowupGraduation', GraduationSchema, `${prefix}_graduations`),
    connection.model('FollowupReferral', TutoringReferralSchema, `${prefix}_referrals`),
    connection.model('FollowupAlert', AcademicAlertSchema, `${prefix}_alerts`),
    connection.model('FollowupCertificate', IssuedCertificateSchema, `${prefix}_certificates`),
  ];
  const created = [];
  try {
    for (const model of models) { await model.createCollection(); created.push(model); await model.init(); }
    const [students, graduations, referrals, alerts, certificates] = models;
    const dni = '12345678';
    await students.create({ dni, name: 'Prueba', lastName: 'Temporal', email: 'test@example.invalid' });
    const fixture = (rows) => ({ find: () => ({ lean: () => ({ exec: async () => rows }) }) });
    const analytics = new AnalyticsService(students, fixture([]), fixture([]), fixture([]), fixture([]), referrals);
    await analytics.referStudentToTutoring(dni, 'Prueba de seguimiento');
    let record = await analytics.updateTutoringCase(dni, { status: 'EN_ATENCION', responsible: 'Tutor de prueba', note: 'Entrevista registrada', revision: 0 });
    assert.equal(record.history.length, 1);
    await assert.rejects(analytics.updateTutoringCase(dni, { status: 'EN_ATENCION', responsible: 'Otro tutor', note: 'Dato obsoleto', revision: 0 }), /otra sesión/);
    record = await analytics.updateTutoringCase(dni, { status: 'CERRADO', responsible: 'Tutor de prueba', note: 'Plan de apoyo completado', revision: 1 });
    assert.ok(record.closedAt); assert.equal(record.history.length, 2);
    record = await analytics.updateTutoringCase(dni, { status: 'PENDIENTE', responsible: '', note: 'Nuevo seguimiento solicitado', revision: 2 });
    assert.equal(record.closedAt, null); assert.equal(record.history.length, 3);
    assert.equal((await new AnalyticsService(students, fixture([]), fixture([]), fixture([]), fixture([]), referrals).listTutoringReferrals())[0].revision, 3);
    console.log('Tutoring: attention, close, reopen, history persistence and stale revision protection passed.');

    let indicators = [{ studentDni: dni, studentName: 'Prueba', riskLevel: 'SIN_DATOS', metrics: { attendanceRate: 50, currentGpa: 0 } }];
    const service = new AcademicAlertsService({ calculateAttritionRisk: async () => ({ students: indicators }) }, alerts);
    await service.refresh(); assert.equal(await alerts.countDocuments(), 2);
    const unread = await alerts.findOne({ key: `${dni}:ASISTENCIA` }).lean();
    const initial = await service.markRead(`${dni}:ASISTENCIA`, unread.detectedAt.toISOString());
    await service.refresh();
    let alert = await alerts.findOne({ key: `${dni}:ASISTENCIA` }).lean();
    assert.equal(alert.readAt.toISOString(), initial.readAt.toISOString());
    assert.equal(alert.detectedAt.toISOString(), initial.detectedAt.toISOString());
    indicators[0].metrics.attendanceRate = 80; indicators[0].metrics.currentGpa = 18;
    await service.refresh();
    alert = await alerts.findOne({ key: `${dni}:ASISTENCIA` }).lean();
    assert.equal(alert.level, 'MODERADO'); assert.equal(alert.readAt, null);
    await assert.rejects(service.markRead(`${dni}:ASISTENCIA`, initial.detectedAt.toISOString()), /cambió/);
    assert.equal((await alerts.findOne({ kind: 'NOTAS' }).lean()).resolutionReason, 'RECUPERADO');
    indicators[0].metrics.attendanceRate = null;
    await service.refresh(); assert.equal((await alerts.findOne({ kind: 'ASISTENCIA' }).lean()).resolutionReason, 'SIN_DATOS');
    indicators[0].metrics.attendanceRate = 50; await service.refresh();
    assert.equal((await alerts.findOne({ kind: 'ASISTENCIA' }).lean()).active, true);
    indicators = []; await service.refresh();
    assert.equal((await alerts.findOne({ kind: 'ASISTENCIA' }).lean()).resolutionReason, 'INACTIVO');
    assert.equal(await alerts.countDocuments(), 2);
    console.log('Alerts: deduplication, preserved read status, severity change, recovery, missing-data distinction and inactive students passed.');

    await graduations.create({ studentDni: dni, status: 'Apto', docsChecked: { solicitud: true, constanciaEgresado: true, practicasPre: true, pagoDerecho: true } });
    const registry = new CertificatesService(certificates, graduations, students);
    const pdf = await PDFDocument.create(); pdf.addPage();
    const bytes = Buffer.from(await pdf.save());
    const input = { studentDni: dni, number: 'CERT-PRUEBA-1', issuedDate: '2020-01-01', issuerName: 'Firmante de prueba', fileName: 'prueba.pdf', fileData: bytes.toString('base64') };
    let certificate = await registry.register(input, 'fixture-operator');
    assert.equal(certificate.fileData, undefined);
    assert.equal((await registry.list())[0].fileData, undefined);
    await registry.register(input, 'fixture-operator'); assert.equal(await certificates.countDocuments(), 1);
    await assert.rejects(registry.register({ ...input, number: 'CERT-OTRO' }, 'fixture-operator'), /vigente/);
    let verified = await registry.verify(certificate.verificationCode);
    assert.equal(verified.active, true); assert.equal(verified.studentDni, undefined); assert.equal(verified.signatureValidation, 'NO_REALIZADA');
    assert.equal(verified.sha256, createHash('sha256').update(bytes).digest('hex'));
    const file = await registry.getFile(String(certificate._id)); assert.equal(file.fileData, input.fileData);
    await registry.revoke(String(certificate._id), 'Corrección de prueba', 'fixture-operator');
    assert.equal((await registry.verify(certificate.verificationCode)).active, false);
    certificate = await registry.register({ ...input, number: 'CERT-PRUEBA-2' }, 'fixture-operator');
    assert.equal(await certificates.countDocuments(), 2);
    assert.equal(certificate.active, true);
    assert.equal((await new CertificatesService(certificates, graduations, students).listForStudent(dni)).length, 2);
    console.log('Certificates: original PDF preservation, hashes, metadata privacy, idempotency, revocation, replacement and persistent history passed.');
  } finally {
    try {
      for (const model of created) {
        if (!model.collection.name.startsWith(`${prefix}_`) || !prefix.startsWith('codex_followup_test_')) throw new Error('Unexpected cleanup target.');
        await model.collection.drop();
      }
      console.log('Temporary follow-up test collections removed.');
    } finally { await connection.close(); }
  }
}
main().catch((error) => { console.error('Follow-up integration failed:', error.name, error.code || '', error.message?.replace(/mongodb[^\s]*/g, '[connection]')); process.exitCode = 1; });
