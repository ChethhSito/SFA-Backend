// Reemplaza los datos de demostración de la base local y conserva la colección users.
// Uso: node scripts/reset-demo-data.cjs --apply
process.loadEnvFile('.env');
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || '';
const parsed = new URL(uri);
if (process.argv[2] !== '--apply') throw new Error('Añada --apply para ejecutar la limpieza.');
if (!['localhost', '127.0.0.1', '::1'].includes(parsed.hostname)) throw new Error('Solo se admite MongoDB local.');

const now = new Date();
const careers = [
  ['electronica', 'EIND', 'Electricidad Industrial', 'Formación técnica en instalaciones, operación y mantenimiento de sistemas eléctricos industriales.', ['Fundamentos de Electricidad', 'Instalaciones Eléctricas', 'Máquinas Eléctricas', 'Automatización Industrial', 'Sistemas de Potencia', 'Proyecto Integrador Eléctrico']],
  ['contabilidad', 'CONT', 'Contabilidad', 'Formación técnica en registro contable, tributación, costos y análisis financiero.', ['Fundamentos de Contabilidad', 'Contabilidad Financiera', 'Tributación', 'Costos y Presupuestos', 'Auditoría', 'Proyecto Integrador Contable']],
  ['enfermeria', 'ENFT', 'Enfermería Técnica', 'Formación técnica orientada a la atención y cuidado de las personas en servicios de salud.', ['Anatomía y Fisiología', 'Técnicas de Enfermería', 'Atención Primaria', 'Farmacología Básica', 'Enfermería Clínica', 'Práctica Integrada de Enfermería']],
  ['farmacia', 'FARM', 'Farmacia Técnica', 'Formación técnica en dispensación, almacenamiento y gestión de productos farmacéuticos.', ['Fundamentos de Farmacia', 'Dispensación', 'Farmacología', 'Gestión de Boticas', 'Control de Calidad', 'Práctica Integrada de Farmacia']],
  ['mecanica', 'MECA', 'Mecatrónica Automotriz', 'Formación técnica en diagnóstico, mantenimiento y sistemas electrónicos de vehículos.', ['Mecánica Automotriz', 'Sistemas Eléctricos del Vehículo', 'Electrónica Vehicular', 'Diagnóstico Automotriz', 'Automatización Automotriz', 'Proyecto Integrador Automotriz']],
  ['sistemas', 'APSTI', 'Arquitectura de Plataformas y Servicios de Tecnologías de la Información', 'Formación técnica en desarrollo de software, redes y servicios de tecnologías de la información.', ['Fundamentos de Programación', 'Redes de Computadoras', 'Bases de Datos', 'Desarrollo Web', 'Seguridad de Sistemas', 'Proyecto Integrador de Software']],
];

async function main() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const before = {};
  for (const { name } of await db.listCollections().toArray()) {
    if (name === 'users' || name.startsWith('system.')) continue;
    before[name] = await db.collection(name).countDocuments();
  }
  const usersBefore = await db.collection('users').countDocuments();
  if (usersBefore < 5) throw new Error('No se encontraron las cuentas institucionales esperadas. No se limpiará la base.');
  for (const name of Object.keys(before)) await db.collection(name).deleteMany({});

  const put = async (collection, items) => { if (items.length) await db.collection(collection).insertMany(items); };
  await put('careers', careers.map(([id, code, name, description]) => ({ id, code, name, description, durationSemesters: 6, status: 'Activo', createdAt: now, updatedAt: now })));
  const courses = [], versions = [], curriculum = [];
  for (const [careerId, code, , , names] of careers) {
    const versionId = `demo-malla-${careerId}-2027`;
    versions.push({ id: versionId, careerId, name: 'Malla referencial de demostración 2027', isActive: true, status: 'Activa', created: '10/11/2026', createdAt: now, updatedAt: now });
    names.forEach((name, index) => {
      const courseId = `demo-${code.toLowerCase()}-${index + 1}`;
      courses.push({ id: courseId, code: `${code}${index + 1}`, name, careerId, referenceCycle: index + 1, credits: 3, theoryHours: 2, labHours: 2, type: 'Especialidad', status: 'Activo', createdAt: now, updatedAt: now });
      curriculum.push({ id: `${versionId}-${index + 1}`, careerId, courseId, versionId, cycle: index + 1, createdAt: now, updatedAt: now });
    });
  }
  await put('academic_courses', courses);
  await put('curriculum_versions', versions);
  await put('curriculum_items', curriculum);
  await put('academic_periods', [
    { id: 'demo-2026-ii', name: 'Periodo 2026-II', startDate: '2026-08-10', endDate: '2026-12-18', status: 'Activo', isActive: true, createdAt: now, updatedAt: now },
    { id: 'demo-2027-i', name: 'Periodo 2027-I', startDate: '2027-03-22', endDate: '2027-07-30', status: 'Planificación', isActive: false, createdAt: now, updatedAt: now },
  ]);
  await put('admissionperiods', [{ id: 'demo-admision-2027-i', academicPeriodId: 'demo-2027-i', name: 'Admisión 2027-I · demostración', status: 'APERTURADO', isActive: true, preEnrollmentStartDate: '2026-11-10', preEnrollmentEndDate: '2027-03-05', admissionDate: '2027-03-06', resultsPublicationDate: '2027-03-08', enrollmentStartDate: '2027-03-09', enrollmentEndDate: '2027-03-19', classesStartDate: '2027-03-22', createdAt: now, updatedAt: now }]);
  await put('academic_teachers', [{ dni: '99887766', name: 'Manuel', lastName: 'Ramos Salazar', email: 'mramos@iestpsfa.edu.pe', specialty: 'Electricidad Industrial', specialties: ['Electricidad Industrial'], status: 'Disponible', careerId: 'electronica', createdAt: now, updatedAt: now }]);
  await put('academic_shifts', [{ id: 'demo-manana', name: 'Mañana', startTime: '08:00 AM', endTime: '01:00 PM', createdAt: now, updatedAt: now }]);
  await put('classrooms', [{ id: 'demo-aula-101', name: 'Aula 101', type: 'Teoría', location: 'Pabellón A', capacity: 30, careerId: 'electronica', createdAt: now, updatedAt: now }]);
  await put('academic_schedules', [{ id: 'demo-lunes-0800', dayOfWeek: 'Lunes', startTime: '08:00 AM', endTime: '09:40 AM', timeSlot: '08:00 AM - 09:40 AM', shiftId: 'demo-manana', createdAt: now, updatedAt: now }]);
  await put('academic_groups', [{ id: 'demo-ei-i-a', name: 'EI-I-A', periodId: 'demo-2026-ii', careerId: 'electronica', cycle: 1, shiftId: 'demo-manana', capacity: 30, curriculumVersionId: 'demo-malla-electronica-2027', createdAt: now, updatedAt: now }]);
  await put('academic_programming', [{ id: 'demo-clase-lunes', groupId: 'demo-ei-i-a', courseId: 'demo-eind-1', teacherDni: '99887766', classroomId: 'demo-aula-101', scheduleId: 'demo-lunes-0800', sessionType: 'Teoría', sessionClassType: 'Teo', dayOfWeek: 'Lunes', startTime: '08:00 AM', endTime: '09:40 AM', shiftId: 'demo-manana', pedagogicalHours: 2, createdAt: now, updatedAt: now }]);
  await put('courses', [{ code: 'DEMO-EIND-1', name: 'Fundamentos de Electricidad', career: 'Electricidad Industrial', careerId: 'electronica', group: 'EI-I-A', curriculum: 'I ciclo', credits: 3, classroom: 'Aula 101', schedule: 'Lunes 08:00 a 09:40', teacherDni: '99887766', teacherName: 'Manuel Ramos Salazar', startDate: '2026-08-10', endDate: '2026-12-18', studentCount: 1, isGradesClosed: false, createdAt: now, updatedAt: now }]);
  await put('students', [{ dni: '12345678', name: 'Luis Alberto', lastName: 'Castillo', email: 'luis.castillo@iestpsfa.edu.pe', phone: '912345678', gender: 'Masculino', district: 'Villa María del Triunfo', province: 'Lima', address: 'Dirección ficticia de demostración', cycleStatuses: [{ cycleNumber: 1, year: 2026, status: 'Matriculado', average: 0, credits: 3, courses: [{ name: 'Fundamentos de Electricidad', grade: 0, approved: false }] }], createdAt: now, updatedAt: now }]);
  await put('enrollments', [{ id: 'demo-matricula-luis-2026-ii', studentDni: '12345678', studentName: 'Luis Alberto Castillo', programId: 'electronica', periodId: 'demo-2026-ii', period: 'Periodo 2026-II', academicStatus: 'MATRICULADO', paymentStatus: 'Validado', paymentOperation: 'DEMO-MAT-2026-001', shift: 'Mañana', enrollmentDate: '2026-08-10', createdAt: now, updatedAt: now }]);
  await put('applicants', [{ id: 'demo-postulante-2027-i', applicantCode: '202700001', dni: '73481260', name: 'Rosa Elena', lastName: 'Campos Díaz', email: 'rosa.campos.demo@example.com', phone: '987654320', programId: 'contabilidad', periodId: 'demo-admision-2027-i', paymentStatus: 'No Pagado', examStatus: 'No Programado', admitted: false, folderStatus: 'Pending', password: 'clave123', registeredAt: '2026-11-10', createdAt: now, updatedAt: now }]);
  const concepts = [
    ['ADM01', 'Derecho de examen de admisión', 120, 'Admisión'], ['MAT01', 'Matrícula semestral', 250, 'Matrícula'],
    ['CER01', 'Certificado de estudios', 50, 'Trámites'], ['CON01', 'Constancia de matrícula', 30, 'Trámites'],
    ['DOC01', 'Constancia de trabajo docente', 30, 'Trámites'], ['DOC02', 'Certificado de servicios docentes', 50, 'Trámites'],
  ].map(([code, name, amount, category], index) => ({ id: `demo-tasa-${index + 1}`, code, name, amount, category, active: true, description: 'Monto ficticio para demostración del flujo MAF.' }));
  await put('maf_state', [
    { key: 'concepts', items: concepts, updatedAt: now },
    { key: 'obligations', items: [{ id: 'OBL-MAT-12345678', studentDni: '12345678', studentName: 'Luis Alberto Castillo', conceptCode: 'MAT01', conceptName: 'Matrícula semestral', amount: 250, discount: 0, finalAmount: 250, period: 'Periodo 2026-II', status: 'Validado', dateCreated: '2026-08-10', voucherRegistered: true, voucherDetails: { operationNumber: 'DEMO-MAT-2026-001', bankName: 'Banco de la Nación', paymentDate: '2026-08-10', amountPaid: 250, observations: 'Registro ficticio de demostración' } }], updatedAt: now },
    { key: 'auditLogs', items: [], updatedAt: now },
  ]);
  await put('payments', [{ paymentId: 'DEMO-PAGO-MAT-001', studentDni: '12345678', concept: 'Matrícula semestral', amount: 250, date: '2026-08-10', status: 'APROBADO', paymentMethod: 'BANCO', receiptNumber: 'DEMO-MAT-2026-001', bankOperationKey: 'DEMO-MAT-2026-001', mafObligationId: 'OBL-MAT-12345678', notes: 'Pago ficticio de demostración', createdAt: now, updatedAt: now }]);
  await put('transparency_documents', [
    ['GESTIÓN', 'Documentos de Gestión', 'https://www.iestpsfa.edu.pe/transparencia/doc_gestion'],
    ['ESTADÍSTICAS', 'Estadísticas', 'https://www.iestpsfa.edu.pe/transparencia/estadisticas'],
    ['INVERSIÓN', 'Inversiones', 'https://www.iestpsfa.edu.pe/transparencia/inversiones'],
    ['LICENCIAMIENTO', 'Licenciamiento', 'https://www.iestpsfa.edu.pe/transparencia/licenciamiento'],
  ].map(([code, title, url], index) => ({ id: `oficial-${index + 1}`, code, title, url, description: 'Sección del sitio web institucional.', published: true, publishedAt: now })));
  console.log(JSON.stringify({ usersPreserved: usersBefore, removed: before, inserted: { careers: careers.length, courses: courses.length, academicPeriods: 2, admissionPeriods: 1, students: 1, applicants: 1, payments: 1, transparencyLinks: 4 } }, null, 2));
  await mongoose.disconnect();
}

main().catch(async error => { console.error(error.message); await mongoose.disconnect(); process.exit(1); });
