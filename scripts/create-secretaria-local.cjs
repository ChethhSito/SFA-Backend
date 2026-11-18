const { randomBytes } = require('node:crypto');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function main() {
  const uri = 'mongodb://127.0.0.1:27017/sfa_database';
  const parsed = new URL(uri);
  if (!['127.0.0.1', 'localhost'].includes(parsed.hostname) || parsed.pathname !== '/sfa_database') {
    throw new Error('La cuenta de demostración solo puede crearse en la base local sfa_database.');
  }
  await mongoose.connect(uri);
  const users = mongoose.connection.db.collection('users');
  const email = 'secretaria@iestpsfa.edu.pe';
  const dni = '10000005';
  const existing = await users.findOne({ $or: [{ email }, { dni }] });
  if (existing) {
    console.log('La cuenta de Secretaría ya existe. No se modificó su contraseña.');
    return;
  }
  const password = `SFA-${randomBytes(12).toString('base64url')}!`;
  await users.insertOne({
    id: 'USR-SEC-001', firebaseUid: 'seed-USR-SEC-001', dni, email,
    displayName: 'Gestor de Secretaría Académica',
    lastName: 'IESTP SFA', phone: '',
    role: 'secretaria', assignedModule: 'Secretaría Académica - Emisión de Trámites',
    status: 'Activo', password: await bcrypt.hash(password, 10),
    createdAt: new Date(), updatedAt: new Date(),
  });
  console.log(JSON.stringify({ email, dni, password }));
}

main().catch(error => { console.error(error.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
