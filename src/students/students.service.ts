import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Student, StudentDocument } from './schemas/student.schema';
import { UpdateStudentPersonalDto } from './dto/update-student-personal.dto';

@Injectable()
export class StudentsService {
  constructor(
    @InjectModel(Student.name)
    private studentModel: Model<StudentDocument>,
  ) {}

  async findAll(): Promise<Student[]> {
    return this.studentModel.find().exec();
  }

  async findByDni(dni: string): Promise<Student> {
    const student = await this.studentModel.findOne({ dni }).exec();
    if (!student) {
      throw new NotFoundException(`Estudiante con DNI ${dni} no encontrado.`);
    }
    return student;
  }

  async createOrUpdate(studentData: Partial<Student>): Promise<Student> {
    const { dni } = studentData;
    if (!dni) {
      throw new NotFoundException('DNI de estudiante requerido.');
    }
    const existing = await this.studentModel.findOne({ dni }).exec();
    if (existing) {
      Object.assign(existing, studentData);
      return existing.save();
    }
    const newStudent = new this.studentModel(studentData);
    return newStudent.save();
  }

  async updatePersonalData(dni: string, dto: UpdateStudentPersonalDto): Promise<Student> {
    const updated = await this.studentModel
      .findOneAndUpdate({ dni }, { $set: dto }, { new: true, upsert: true })
      .exec();
    return updated;
  }

  async updateCycleStatuses(dni: string, cycleStatuses: any[]): Promise<Student> {
    const updated = await this.studentModel
      .findOneAndUpdate({ dni }, { $set: { cycleStatuses } }, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException(`Estudiante con DNI ${dni} no encontrado.`);
    }
    return updated;
  }
}
