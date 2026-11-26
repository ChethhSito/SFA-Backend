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
    const { _id, id, ...cleanData } = createApplicantDto;

    // Auto-generate applicantCode if not provided
    if (!cleanData.applicantCode) {
      const periodName = period.name;
      const yearMatch = periodName.match(/(\d{4})/);
      const year = yearMatch ? yearMatch[1] : new Date().getFullYear().toString();
      const half = /-II\b/i.test(periodName) ? '2' : '1';
      const prefix = `${year}${half}`;

      const existing = await this.applicantModel
        .find({ applicantCode: { $regex: `^${prefix}` } })
        .select('applicantCode')
        .lean()
        .exec();
      let maxSerial = 0;
      existing.forEach((app) => {
        const numStr = app.applicantCode ? app.applicantCode.replace(prefix, '') : '';
        const parsed = parseInt(numStr, 10);
        if (!isNaN(parsed) && parsed > maxSerial) {
          maxSerial = parsed;
        }
      });
      let nextSerial = maxSerial + 1;
      let candidateCode = `${prefix}${String(nextSerial).padStart(4, '0')}`;
      while (await this.applicantModel.exists({ applicantCode: candidateCode })) {
        nextSerial++;
        candidateCode = `${prefix}${String(nextSerial).padStart(4, '0')}`;
      }
      cleanData.applicantCode = candidateCode;
    }

    if (!cleanData.registeredAt) {
      cleanData.registeredAt = new Date().toISOString().split('T')[0];
    }

    const createdApplicant = new this.applicantModel(cleanData);
    return createdApplicant.save();
  }

  /**
   * Listado liviano ejecutado directo en MongoDB: nunca transfiere los base64 (fileDataUrl / paymentVoucherUrl)
   * por red desde Atlas. El detalle completo se obtiene bajo demanda con findByDni.
   */
  async findAll(): Promise<any[]> {
    return this.applicantModel
      .aggregate([
        {
          $addFields: {
            hasPaymentVoucher: { $ne: [{ $ifNull: ['$paymentVoucherUrl', ''] }, ''] },
            'docs.dniFile.hasFile': { $ne: [{ $ifNull: ['$docs.dniFile.fileDataUrl', ''] }, ''] },
            'docs.certificadoFile.hasFile': { $ne: [{ $ifNull: ['$docs.certificadoFile.fileDataUrl', ''] }, ''] },
            'docs.partidaFile.hasFile': { $ne: [{ $ifNull: ['$docs.partidaFile.fileDataUrl', ''] }, ''] },
            'docs.fotoFile.hasFile': { $ne: [{ $ifNull: ['$docs.fotoFile.fileDataUrl', ''] }, ''] },
          },
        },
        {
          $unset: [
            'paymentVoucherUrl',
            'docs.dniFile.fileDataUrl',
            'docs.certificadoFile.fileDataUrl',
            'docs.partidaFile.fileDataUrl',
            'docs.fotoFile.fileDataUrl',
          ],
        },
      ])
      .exec();
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
    const { _id, id, ...cleanData } = updateApplicantDto;

    const existing = await this.applicantModel
      .findOne({ dni })
      .select('dni periodId applicantCode paymentStatus')
      .lean()
      .exec();
    if (!existing) {
      throw new NotFoundException(`Applicant with DNI ${dni} not found`);
    }

    if (cleanData.periodId !== undefined && cleanData.periodId !== existing.periodId) {
      throw new BadRequestException('No se puede trasladar un postulante a otra convocatoria');
    }

    if (cleanData.dni && cleanData.dni === existing.dni) {
      delete cleanData.dni;
    }
    if (existing.applicantCode) {
      delete cleanData.applicantCode;
    }

    const setPayload: Record<string, any> = {};
    const unsetPayload: Record<string, any> = {};

    for (const [k, v] of Object.entries(cleanData)) {
      if (k === 'docs' && v && typeof v === 'object') {
        for (const key of ['dniFile', 'certificadoFile', 'partidaFile', 'fotoFile']) {
          const nextDoc = (v as any)[key];
          if (nextDoc && typeof nextDoc === 'object') {
            if (nextDoc.status !== undefined) setPayload[`docs.${key}.status`] = nextDoc.status;
            if (nextDoc.fileName !== undefined) setPayload[`docs.${key}.fileName`] = nextDoc.fileName;
            if (nextDoc.observations !== undefined) setPayload[`docs.${key}.observations`] = nextDoc.observations;
            if (nextDoc.status === 'No Enviado') {
              unsetPayload[`docs.${key}.fileDataUrl`] = '';
            } else if (nextDoc.fileDataUrl) {
              setPayload[`docs.${key}.fileDataUrl`] = nextDoc.fileDataUrl;
            }
          }
        }
      } else if (k === 'paymentVoucherUrl') {
        if (cleanData.paymentStatus === 'No Pagado') {
          unsetPayload.paymentVoucherUrl = '';
        } else if (v) {
          setPayload.paymentVoucherUrl = v;
        }
      } else {
        setPayload[k] = v;
      }
    }

    const updateOps: Record<string, any> = {};
    if (Object.keys(setPayload).length > 0) updateOps.$set = setPayload;
    if (Object.keys(unsetPayload).length > 0) updateOps.$unset = unsetPayload;

    const updated = await this.applicantModel
      .findOneAndUpdate({ dni }, updateOps, { returnDocument: 'after' })
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
