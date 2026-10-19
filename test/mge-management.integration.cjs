const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const dns = require('node:dns');
const mongoose = require('mongoose');
const { StudentSchema } = require('../dist/students/schemas/student.schema');
const { EnrollmentSchema } = require('../dist/enrollments/schemas/enrollment.schema');
const { GraduationSchema } = require('../dist/graduations/schemas/graduation.schema');
const { StudentsService } = require('../dist/students/students.service');
const { EnrollmentsService } = require('../dist/enrollments/enrollments.service');
const { GraduationsService } = require('../dist/graduations/graduations.service');

async function main() {
  process.loadEnvFile('.env');
  dns.setServers(['8.8.8.8', '1.1.1.1']);
  const prefix = `codex_mge_test_${randomUUID().replaceAll('-', '')}`;
  const connection = await mongoose.createConnection(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sfa_database', { serverSelectionTimeoutMS: 15000 }).asPromise();
  const models = [connection.model('MgeStudentTest', StudentSchema, `${prefix}_students`), connection.model('MgeEnrollmentTest', EnrollmentSchema, `${prefix}_enrollments`), connection.model('MgeGraduationTest', GraduationSchema, `${prefix}_graduations`)];
  const created = [];
  try {
    for (const model of models) { await model.createCollection(); created.push(model); await model.init(); }
    const [students, enrollments, graduations] = models;
    const dni = '12345678';
    await students.create({ dni, name: 'Prueba', lastName: 'Temporal', email: 'test@example.invalid', cycleStatuses: [{ cycleNumber: 1, courses: [{ name: 'Curso de prueba', grade: 0 }] }] });
    await enrollments.create({ studentDni: dni, programId: 'test', academicStatus: 'MATRICULADO', paymentStatus: 'Validado', paymentOperation: 'TEST-ONLY' });
    const originalEnrollment = JSON.stringify(await enrollments.findOne({ studentDni: dni }).lean());
    const lifecycle = new StudentsService(students);
    const inactive = await lifecycle.setActive(dni, false, 'Baja temporal de prueba');
    assert.equal(inactive.active, false);
    const repeated = await new StudentsService(students).setActive(dni, false, 'Reintento');
    assert.equal(repeated.deactivationReason, 'Baja temporal de prueba');
    assert.equal(repeated.deactivatedAt.toISOString(), inactive.deactivatedAt.toISOString());
    await assert.rejects(new EnrollmentsService(enrollments, students).update(dni, { academicStatus: 'MATRICULADO' }), /de baja/);
    const active = await lifecycle.setActive(dni, true);
    assert.equal(active.active, true);
    assert.equal(active.cycleStatuses[0].courses[0].grade, 0);
    assert.equal(JSON.stringify(await enrollments.findOne({ studentDni: dni }).lean()), originalEnrollment);
    const service = new GraduationsService(graduations);
    await service.create({ studentDni: dni, status: 'Solicitado' });
    let record = await service.findByDni(dni);
    assert.equal(record.docsChecked.solicitud, false);
    await assert.rejects(service.update(dni, { status: 'Apto' }), /requisitos/);
    await service.update(dni, { status: 'En Proceso', docsChecked: { solicitud: true, constanciaEgresado: true, practicasPre: true, pagoDerecho: true }, obs: 'Revisión de prueba' });
    await service.update(dni, { status: 'Apto' });
    record = await new GraduationsService(graduations).findByDni(dni);
    assert.equal(record.status, 'Apto');
    assert.equal(record.obs, 'Revisión de prueba');
    console.log('MongoDB MGE: reversible and idempotent deactivation, enrollment/grades preserved, and persisted documentary review passed.');
  } finally {
    try {
      for (const model of created) {
        if (!model.collection.name.startsWith(`${prefix}_`) || !prefix.startsWith('codex_mge_test_')) throw new Error('Unexpected cleanup target.');
        await model.collection.drop();
      }
      console.log('Temporary MGE test collections removed.');
    } finally { await connection.close(); }
  }
}
main().catch((error) => { console.error('MGE integration failed:', error.name, error.code || '', error.message?.replace(/mongodb[^\s]*/g, '[connection]')); process.exitCode = 1; });
