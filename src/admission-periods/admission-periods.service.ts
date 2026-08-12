import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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
    return this.admissionPeriodModel.find().exec();
  }

  async findOne(id: string): Promise<AdmissionPeriodDocument> {
    const period = await this.admissionPeriodModel.findById(id).exec();
    if (!period) {
      throw new NotFoundException(`AdmissionPeriod with id ${id} not found`);
    }
    return period;
  }

  async update(id: string, updateDto: any): Promise<AdmissionPeriodDocument> {
    const updated = await this.admissionPeriodModel
      .findByIdAndUpdate(id, updateDto, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException(`AdmissionPeriod with id ${id} not found`);
    }
    return updated;
  }

  async remove(id: string): Promise<any> {
    return this.admissionPeriodModel.findByIdAndDelete(id).exec();
  }
}
