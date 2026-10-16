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
    const list = await this.enrollmentModel.find().exec();
    return list.map((item) => {
      const doc = item.toObject ? item.toObject() : item;
      if (doc.shift) {
        doc.shift = doc.shift.replace(/Ma[\uFFFD\?a-zA-Z]*ana/gi, 'Mañana').replace(/Maana/gi, 'Mañana');
      }
      return doc;
    }) as EnrollmentDocument[];
  }

  async findByDni(studentDni: string): Promise<EnrollmentDocument> {
    const enrollment = await this.enrollmentModel.findOne({ studentDni }).exec();
    if (!enrollment) {
      throw new NotFoundException(`Enrollment for student DNI ${studentDni} not found`);
    }
    const doc = enrollment.toObject ? enrollment.toObject() : enrollment;
    if (doc.shift) {
      doc.shift = doc.shift.replace(/Ma[\uFFFD\?a-zA-Z]*ana/gi, 'Mañana').replace(/Maana/gi, 'Mañana');
    }
    return doc as EnrollmentDocument;
  }

  async update(studentDni: string, updateEnrollmentDto: any): Promise<EnrollmentDocument> {
    const { _id, id, ...cleanData } = updateEnrollmentDto;
    const updated = await this.enrollmentModel
      .findOneAndUpdate({ studentDni }, { $set: cleanData }, { returnDocument: 'after' })
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
