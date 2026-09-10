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
    // Auto-generate applicantCode if not provided
    if (!createApplicantDto.applicantCode) {
      const periodId = createApplicantDto.periodId || '1';
      // Build prefix from periodId (e.g. '2026-I' → '20261', '2026-II' → '20262')
      const yearMatch = periodId.match(/(\d{4})/);
      const year = yearMatch ? yearMatch[1] : new Date().getFullYear().toString();
      const half = periodId.includes('II') || periodId.includes('2') ? '2' : '1';
      const prefix = `${year}${half}`;

      const existing = await this.applicantModel
        .find({ applicantCode: { $regex: `^${prefix}` } })
        .exec();
      let maxSerial = 0;
      existing.forEach((app) => {
        const numStr = app.applicantCode ? app.applicantCode.replace(prefix, '') : '';
        const parsed = parseInt(numStr, 10);
        if (!isNaN(parsed) && parsed > maxSerial) {
          maxSerial = parsed;
        }
      });
      const nextSerial = maxSerial + 1;
      createApplicantDto.applicantCode = `${prefix}${String(nextSerial).padStart(4, '0')}`;
    }

    if (!createApplicantDto.registeredAt) {
      createApplicantDto.registeredAt = new Date().toISOString().split('T')[0];
    }

    const createdApplicant = new this.applicantModel(createApplicantDto);
    return createdApplicant.save();
  }

  async findAll(): Promise<ApplicantDocument[]> {
    return this.applicantModel.find().exec();
  }

  async findByDni(dni: string): Promise<ApplicantDocument | null> {
    return this.applicantModel.findOne({ dni }).exec();
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
