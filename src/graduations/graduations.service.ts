import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Graduation, GraduationDocument } from './schemas/graduation.schema';

@Injectable()
export class GraduationsService {
  constructor(
    @InjectModel(Graduation.name)
    private graduationModel: Model<GraduationDocument>,
  ) {}

  async create(createDto: any): Promise<GraduationDocument> {
    const created = new this.graduationModel(createDto);
    return created.save();
  }

  async findAll(): Promise<GraduationDocument[]> {
    return this.graduationModel.find().exec();
  }

  async findByDni(studentDni: string): Promise<GraduationDocument> {
    const graduation = await this.graduationModel.findOne({ studentDni }).exec();
    if (!graduation) {
      throw new NotFoundException(`Graduation record for DNI ${studentDni} not found`);
    }
    return graduation;
  }

  async update(studentDni: string, updateDto: any): Promise<GraduationDocument> {
    const updated = await this.graduationModel
      .findOneAndUpdate({ studentDni }, updateDto, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException(`Graduation record for DNI ${studentDni} not found`);
    }
    return updated;
  }

  async remove(studentDni: string): Promise<any> {
    return this.graduationModel.deleteOne({ studentDni }).exec();
  }
}
