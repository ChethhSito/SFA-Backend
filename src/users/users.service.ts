import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async onModuleInit() {
    await this.seedInitialUsers();
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
        const exists = await this.userModel.findOne({
          $or: [{ email: u.email }, { dni: u.dni }, { id: u.id }]
        }).exec();

        if (!exists) {
          await this.userModel.create(u);
          console.log(`[Seed Users] Creado usuario inicial en MongoDB: ${u.email} (${u.role})`);
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

  async create(createDto: any): Promise<UserDocument> {
    const created = new this.userModel(createDto);
    return created.save();
  }

  async findAll(): Promise<UserDocument[]> {
    return this.userModel.find().exec();
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

  async update(id: string, updateDto: any): Promise<UserDocument> {
    const updated = await this.userModel
      .findOneAndUpdate(
        { $or: [{ _id: id }, { id: id }, { dni: id }] },
        updateDto,
        { new: true, upsert: true }
      )
      .exec();
    return updated;
  }

  async remove(id: string): Promise<any> {
    return this.userModel.deleteOne({ $or: [{ _id: id }, { id: id }, { dni: id }] }).exec();
  }
}
