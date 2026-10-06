import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AdmissionPeriod, AdmissionPeriodDocument } from './schemas/admission-period.schema';

@Injectable()
export class AdmissionPeriodsService {
  constructor(
    @InjectModel(AdmissionPeriod.name)
    private admissionPeriodModel: Model<AdmissionPeriodDocument>,
  ) {}

  async create(createDto: any): Promise<AdmissionPeriodDocument> {
    const created = new this.admissionPeriodModel(createDto);
    return created.save();
  }

  async findAll(): Promise<AdmissionPeriodDocument[]> {
    const list = await this.admissionPeriodModel.find().exec();
    return list.map((item) => {
      const doc = item.toObject ? item.toObject() : item;
      if (doc.name) {
        doc.name = doc.name
          .replace(/\uFFFD/g, 'é')
          .replace(/Acad[\uFFFD\?a-zA-Z]*mico/gi, 'Académico')
          .replace(/Acadmico/gi, 'Académico');
      }
      return doc;
    }) as AdmissionPeriodDocument[];
  }

  async findOne(id: string): Promise<AdmissionPeriodDocument> {
    const filter = Types.ObjectId.isValid(id) ? { _id: id } : { id };
    const period = await this.admissionPeriodModel.findOne(filter).exec();
    if (!period) {
      throw new NotFoundException(`AdmissionPeriod with id ${id} not found`);
    }
    const doc = period.toObject ? period.toObject() : period;
    if (doc.name) {
      doc.name = doc.name
        .replace(/\uFFFD/g, 'é')
        .replace(/Acad[\uFFFD\?a-zA-Z]*mico/gi, 'Académico')
        .replace(/Acadmico/gi, 'Académico');
    }
    return doc as AdmissionPeriodDocument;
  }

  async update(id: string, updateDto: any): Promise<AdmissionPeriodDocument> {
    const filter = Types.ObjectId.isValid(id) ? { _id: id } : { id };
    const updated = await this.admissionPeriodModel
      .findOneAndUpdate(filter, updateDto, { new: true, upsert: true })
      .exec();
    return updated;
  }

  async remove(id: string): Promise<any> {
    const filter = Types.ObjectId.isValid(id) ? { _id: id } : { id };
    return this.admissionPeriodModel.deleteOne(filter).exec();
  }
}
