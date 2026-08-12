import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Applicant, ApplicantDocument } from './schemas/applicant.schema';

@Injectable()
export class ApplicantsService {
  constructor(
    @InjectModel(Applicant.name)
    private applicantModel: Model<ApplicantDocument>,
  ) {}

  async create(createApplicantDto: any): Promise<ApplicantDocument> {
    const createdApplicant = new this.applicantModel(createApplicantDto);
    return createdApplicant.save();
  }

  async findAll(): Promise<ApplicantDocument[]> {
    return this.applicantModel.find().exec();
  }

  async findByDni(dni: string): Promise<ApplicantDocument> {
    const applicant = await this.applicantModel.findOne({ dni }).exec();
    if (!applicant) {
      throw new NotFoundException(`Applicant with DNI ${dni} not found`);
    }
    return applicant;
  }

  async update(dni: string, updateApplicantDto: any): Promise<ApplicantDocument> {
    const updated = await this.applicantModel
      .findOneAndUpdate({ dni }, updateApplicantDto, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException(`Applicant with DNI ${dni} not found`);
    }
    return updated;
  }

  async remove(dni: string): Promise<any> {
    return this.applicantModel.deleteOne({ dni }).exec();
  }
}
