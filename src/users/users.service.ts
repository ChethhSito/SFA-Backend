import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { MailService } from '../mail/mail.service';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const BCRYPT_SALT_ROUNDS = 10;

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly sessionSecret = process.env.SFA_SESSION_SECRET || randomBytes(32).toString('hex');
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>, private readonly mailService: MailService) {}

  private safe(user: UserDocument) {
    const data = user.toObject();
    delete data.password; delete data.activationTokenHash; delete data.activationExpiresAt;
    return data;
  }

  async login(identifier: string, password: string) {
    const user = await this.userModel.findOne({ $or: [{ email: identifier.toLowerCase() }, { dni: identifier }] });
    if (!user || !user.password || !(await this.verifyPassword(password, user.password)) || !['Activo', 'ACTIVO'].includes(user.status))
      throw new UnauthorizedException('Credenciales inválidas o cuenta inactiva.');
    const payload = Buffer.from(JSON.stringify({ id: user._id.toString(), exp: Date.now() + 8 * 60 * 60 * 1000 })).toString('base64url');
    const signature = createHmac('sha256', this.sessionSecret).update(payload).digest('base64url');
    return { token: `${payload}.${signature}`, user: this.safe(user) };
  }

  async userFromToken(token: string) {
    const [payload, signature] = String(token || '').split('.');
    if (!payload || !signature) throw new UnauthorizedException();
    const expected = createHmac('sha256', this.sessionSecret).update(payload).digest();
    const received = Buffer.from(signature, 'base64url');
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) throw new UnauthorizedException();
    let data: { id: string; exp: number };
    try { data = JSON.parse(Buffer.from(payload, 'base64url').toString()); } catch { throw new UnauthorizedException(); }
    if (data.exp < Date.now()) throw new UnauthorizedException();
    const user = await this.userModel.findById(data.id);
    if (!user || !['Activo', 'ACTIVO'].includes(user.status)) throw new UnauthorizedException();
    return user;
  }

  async activate(token: string, password: string) {
    if (!token || password?.length < 10) throw new BadRequestException('El enlace y una clave de al menos 10 caracteres son obligatorios.');
    const activationTokenHash = createHash('sha256').update(token).digest('hex');
    const user = await this.userModel.findOne({ activationTokenHash, activationExpiresAt: { $gt: new Date() } }).select('+activationTokenHash +activationExpiresAt');
    if (!user) throw new BadRequestException('El enlace de activación venció o ya fue utilizado.');
    user.password = await this.hashPassword(password);
    user.activationTokenHash = undefined;
    user.activationExpiresAt = undefined;
    user.status = 'Activo';
    await user.save();
    return { activated: true };
  }

  async onModuleInit() {
    await this.seedInitialUsers();
  }

  async hashPassword(password: string): Promise<string> {
    if (!password) return '';
    // Si ya está hasheada con bcrypt, no volver a hashear
    if (password.startsWith('$2a$') || password.startsWith('$2b$')) {
      return password;
    }
    const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
    return bcrypt.hash(password, salt);
  }

  async verifyPassword(plain: string, hashOrPlain: string): Promise<boolean> {
    if (!plain || !hashOrPlain) return false;
    if (hashOrPlain.startsWith('$2a$') || hashOrPlain.startsWith('$2b$')) {
      return bcrypt.compare(plain, hashOrPlain);
    }
    return plain === hashOrPlain;
  }

  async seedInitialUsers() {
    const initialUsers = [
      {
        id: "USR-001",
        dni: "00000000",
        email: "admin@iestpsfa.edu.pe",
        displayName: "SuperAdministrador del Sistema",
        lastName: "IESTP SFA",
        phone: "999888777",
        role: "superadmin",
        assignedModule: "SuperAdmin - Control Global",
        status: "ACTIVO",
        password: "123",
        lastLogin: new Date().toISOString()
      },
      {
        id: "USR-002",
        dni: "10000001",
        email: "mamc@iestpsfa.edu.pe",
        displayName: "Gestor MAMC",
        lastName: "Admisión & Matrícula",
        phone: "999111222",
        role: "administrador",
        assignedModule: "MAMC - Admisión y Matrícula",
        status: "ACTIVO",
        password: "123",
        lastLogin: new Date().toISOString()
      },
      {
        id: "USR-003",
        dni: "10000002",
        email: "mpa@iestpsfa.edu.pe",
        displayName: "Gestor MPA",
        lastName: "Planificación Académica",
        phone: "999333444",
        role: "mpa",
        assignedModule: "MPA - Planificación Académica",
        status: "ACTIVO",
        password: "123",
        lastLogin: new Date().toISOString()
      },
      {
        id: "USR-004",
        dni: "10000003",
        email: "mge@iestpsfa.edu.pe",
        displayName: "Gestor MGE",
        lastName: "Gestión de Estudiantes",
        phone: "999555666",
        role: "mge",
        assignedModule: "MGE - Gestión de Estudiantes",
        status: "ACTIVO",
        password: "123",
        lastLogin: new Date().toISOString()
      },
      {
        id: "USR-005",
        dni: "10000004",
        email: "maf@iestpsfa.edu.pe",
        displayName: "Gestor MAF",
        lastName: "Administración y Finanzas",
        phone: "999777888",
        role: "maf",
        assignedModule: "MAF - Administración y Finanzas",
        status: "ACTIVO",
        password: "123",
        lastLogin: new Date().toISOString()
      },
      {
        id: "USR-006",
        dni: "99887766",
        email: "mramos@iestpsfa.edu.pe",
        displayName: "Lic. Manuel Ramos",
        lastName: "Docente Principal",
        phone: "987654321",
        role: "docente",
        assignedModule: "Docente - Control de Aulas",
        status: "ACTIVO",
        password: "123",
        lastLogin: new Date().toISOString()
      },
      {
        id: "USR-007",
        dni: "12345678",
        email: "luis.castillo@iestpsfa.edu.pe",
        displayName: "Luis Alberto Castillo",
        lastName: "Estudiante Regular",
        phone: "912345678",
        role: "alumno",
        assignedModule: "Portal del Alumno",
        status: "ACTIVO",
        password: "123",
        lastLogin: new Date().toISOString()
      }
    ];

    for (const u of initialUsers) {
      try {
        const hashedPassword = await this.hashPassword(u.password || '123');
        const userToSeed = {
          ...u,
          password: hashedPassword,
          firebaseUid: (u as any).firebaseUid || `seed-${u.id}`
        };

        const exists = await this.userModel.findOne({
          $or: [{ email: userToSeed.email }, { dni: userToSeed.dni }, { id: userToSeed.id }]
        }).exec();

        if (!exists) {
          await this.userModel.create(userToSeed);
          console.log(`[Seed Users] Creado usuario inicial en MongoDB con contraseña Bcrypt: ${userToSeed.email} (${userToSeed.role})`);
        }
      } catch (err) {
        console.error(`[Seed Users Error] Error al sembrar usuario ${u.email}:`, err);
      }
    }
  }

  async findOrCreate(firebaseUser: {
    uid: string;
    email: string;
    displayName?: string;
    photoURL?: string;
  }): Promise<UserDocument> {
    const { uid, email, displayName, photoURL } = firebaseUser;

    let user = await this.userModel.findOne({ firebaseUid: uid }).exec();
    if (!user) {
      user = new this.userModel({
        firebaseUid: uid,
        email,
        displayName: displayName || '',
        photoURL: photoURL || '',
      });
      await user.save();
    }
    return user;
  }

  async create(createDto: CreateUserDto) {
    const allowed = ['administrador', 'mpa', 'mge', 'maf', 'docente'];
    if (!allowed.includes(createDto.role || '')) throw new ForbiddenException('SuperAdmin solo puede crear accesos institucionales de gestores y docentes.');
    if (!/^\d{8}$/.test(createDto.dni || '')) throw new BadRequestException('El DNI debe tener 8 dígitos.');
    const email = createDto.email.trim().toLowerCase();
    if (await this.userModel.exists({ $or: [{ email }, { dni: createDto.dni }] })) throw new ConflictException('Ya existe una cuenta con ese DNI o correo.');
    if (createDto.role === 'docente') {
      const teacher = await this.userModel.db.collection('academic_teachers').findOne({ dni: createDto.dni, status: 'Disponible' });
      if (!teacher) throw new BadRequestException('Primero declare al docente como Disponible en MPA.');
    }
    const token = randomBytes(32).toString('base64url');
    const created = await this.userModel.create({ ...createDto, email, password: undefined, status: 'Pendiente', activationTokenHash: createHash('sha256').update(token).digest('hex'), activationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) });
    const sent = await this.mailService.sendActivationEmail({ email, name: created.displayName, role: created.role, token });
    return { user: this.safe(created), invitationSent: sent.success, invitationError: sent.success ? undefined : 'No se pudo enviar la invitación. Configure Brevo y reenvíela.' };
  }

  async findAll() {
    const users = await this.userModel.find({ role: { $in: ['administrador', 'mpa', 'mge', 'maf', 'docente'] } }).select('-password -activationTokenHash -activationExpiresAt').lean().exec();
    return users.map(user => ({ ...user, status: user.status === 'ACTIVO' ? 'Activo' : user.status }));
  }

  async resendInvitation(id: string) {
    const user = await this.userModel.findOne(this.identityQuery(id));
    if (!user) throw new NotFoundException();
    if (user.role === 'superadmin' || user.role === 'alumno' || user.role === 'postulante') throw new ForbiddenException();
    const token = randomBytes(32).toString('base64url');
    user.activationTokenHash = createHash('sha256').update(token).digest('hex');
    user.activationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    user.status = 'Pendiente';
    await user.save();
    const sent = await this.mailService.sendActivationEmail({ email: user.email, name: user.displayName, role: user.role, token });
    return { invitationSent: sent.success };
  }

  async findByUid(uid: string): Promise<UserDocument> {
    const user = await this.userModel.findOne({ 
      $or: [
        { firebaseUid: uid },
        { dni: uid },
        { email: uid.toLowerCase() }
      ] 
    }).exec();
    if (!user) {
      throw new NotFoundException(`User ${uid} not found`);
    }
    return user;
  }

  async update(id: string, updateDto: UpdateUserDto) {
    const { _id, ...cleanData } = updateDto as any;
    delete cleanData.password; delete cleanData.firebaseUid; delete cleanData.id;
    if (cleanData.role && !['administrador', 'mpa', 'mge', 'maf', 'docente'].includes(cleanData.role)) throw new ForbiddenException();
    const existing = await this.userModel.findOne(this.identityQuery(id));
    if (!existing) throw new NotFoundException();
    if (['superadmin', 'alumno', 'postulante'].includes(existing.role)) throw new ForbiddenException();
    if (cleanData.status === 'Activo' && !existing.password) throw new BadRequestException('La cuenta debe activarse con el enlace enviado por correo.');
    const updated = await this.userModel
      .findOneAndUpdate(
        { _id: existing._id },
        { $set: cleanData },
        { returnDocument: 'after' }
      )
      .exec();
    if (!updated) throw new NotFoundException();
    return this.safe(updated);
  }

  async remove(id: string): Promise<any> {
    const existing = await this.userModel.findOne(this.identityQuery(id));
    if (!existing) throw new NotFoundException();
    if (['superadmin', 'alumno', 'postulante'].includes(existing.role)) throw new ForbiddenException();
    return this.userModel.deleteOne({ _id: existing._id }).exec();
  }

  private identityQuery(value: string) {
    return { $or: [...(isValidObjectId(value) ? [{ _id: value }] : []), { id: value }, { dni: value }] };
  }
}
