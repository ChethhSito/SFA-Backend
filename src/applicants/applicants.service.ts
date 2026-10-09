import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Applicant, ApplicantDocument } from './schemas/applicant.schema';
import { AdmissionPeriod, AdmissionPeriodDocument } from '../admission-periods/schemas/admission-period.schema';

@Injectable()
export class ApplicantsService {
  constructor(
    @InjectModel(Applicant.name)
    private applicantModel: Model<ApplicantDocument>,
    @InjectModel(AdmissionPeriod.name)
    private admissionPeriodModel: Model<AdmissionPeriodDocument>,
  ) {}

  async create(createApplicantDto: any): Promise<ApplicantDocument> {
    if (typeof createApplicantDto.periodId !== 'string' || !createApplicantDto.periodId.trim()) {
      throw new BadRequestException('Seleccione una convocatoria de admisión válida');
    }
    const period = await this.admissionPeriodModel.findOne({ id: createApplicantDto.periodId }).exec();
    if (!period || period.status !== 'APERTURADO' || !period.isActive) {
      throw new BadRequestException('No existe una convocatoria de admisión abierta para la preinscripción');
    }
    const todayParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date());
    const part = (type: string) => todayParts.find(value => value.type === type)?.value;
    const today = `${part('year')}-${part('month')}-${part('day')}`;
    if (today < period.preEnrollmentStartDate || today > period.preEnrollmentEndDate) {
      throw new BadRequestException('La convocatoria no está dentro de sus fechas de preinscripción');
    }
    // Auto-generate applicantCode if not provided
    if (!createApplicantDto.applicantCode) {
      const periodName = period.name;
      const yearMatch = periodName.match(/(\d{4})/);
      const year = yearMatch ? yearMatch[1] : new Date().getFullYear().toString();
      const half = /-II\b/i.test(periodName) ? '2' : '1';
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

  async findByDni(identifier: string): Promise<ApplicantDocument | null> {
    return this.applicantModel.findOne({
      $or: [
        { dni: identifier },
        { applicantCode: identifier },
        { email: identifier.toLowerCase() }
      ]
    }).exec();
  }

  async update(dni: string, updateApplicantDto: any): Promise<ApplicantDocument> {
    if (updateApplicantDto.periodId !== undefined) {
      const existing = await this.applicantModel.findOne({ dni }).exec();
      if (!existing) throw new NotFoundException(`Applicant with DNI ${dni} not found`);
      if (updateApplicantDto.periodId !== existing.periodId) {
        throw new BadRequestException('No se puede trasladar un postulante a otra convocatoria');
      }
    }
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
