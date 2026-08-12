import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Enrollment, EnrollmentDocument } from './schemas/enrollment.schema';

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectModel(Enrollment.name)
    private enrollmentModel: Model<EnrollmentDocument>,
  ) {}

  async create(createEnrollmentDto: any): Promise<EnrollmentDocument> {
    const createdEnrollment = new this.enrollmentModel(createEnrollmentDto);
    return createdEnrollment.save();
  }

  async findAll(): Promise<EnrollmentDocument[]> {
    return this.enrollmentModel.find().exec();
  }

  async findByDni(studentDni: string): Promise<EnrollmentDocument> {
    const enrollment = await this.enrollmentModel.findOne({ studentDni }).exec();
    if (!enrollment) {
      throw new NotFoundException(`Enrollment for student DNI ${studentDni} not found`);
    }
    return enrollment;
  }

  async update(studentDni: string, updateEnrollmentDto: any): Promise<EnrollmentDocument> {
    const updated = await this.enrollmentModel
      .findOneAndUpdate({ studentDni }, updateEnrollmentDto, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException(`Enrollment for student DNI ${studentDni} not found`);
    }
    return updated;
  }

  async remove(studentDni: string): Promise<any> {
    return this.enrollmentModel.deleteOne({ studentDni }).exec();
  }
}
