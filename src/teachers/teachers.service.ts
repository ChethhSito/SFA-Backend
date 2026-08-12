import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Teacher, TeacherDocument } from './schemas/teacher.schema';

@Injectable()
export class TeachersService {
  constructor(
    @InjectModel(Teacher.name)
    private teacherModel: Model<TeacherDocument>,
  ) {}

  async create(createTeacherDto: any): Promise<TeacherDocument> {
    const createdTeacher = new this.teacherModel(createTeacherDto);
    return createdTeacher.save();
  }

  async findAll(): Promise<TeacherDocument[]> {
    return this.teacherModel.find().exec();
  }

  async findByDni(dni: string): Promise<TeacherDocument> {
    const teacher = await this.teacherModel.findOne({ dni }).exec();
    if (!teacher) {
      throw new NotFoundException(`Teacher with DNI ${dni} not found`);
    }
    return teacher;
  }

  async update(dni: string, updateTeacherDto: any): Promise<TeacherDocument> {
    const updated = await this.teacherModel
      .findOneAndUpdate({ dni }, updateTeacherDto, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException(`Teacher with DNI ${dni} not found`);
    }
    return updated;
  }

  async remove(dni: string): Promise<any> {
    return this.teacherModel.deleteOne({ dni }).exec();
  }
}
