import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { AdmissionPeriod, AdmissionPeriodDocument } from './schemas/admission-period.schema';
import { AcademicPeriod } from '../mpa/schemas/academic-planning.schemas';
import { Applicant } from '../applicants/schemas/applicant.schema';

const DATE_FIELDS = [
  'preEnrollmentStartDate', 'preEnrollmentEndDate', 'admissionDate',
  'resultsPublicationDate', 'enrollmentStartDate', 'enrollmentEndDate',
] as const;
const STATUSES = new Set(['PENDIENTE', 'APERTURADO', 'EXAMEN', 'MATRICULA', 'CERRADO']);

@Injectable()
export class AdmissionPeriodsService {
  constructor(
    @InjectModel(AdmissionPeriod.name)
    private readonly admissionPeriodModel: Model<AdmissionPeriodDocument>,
    @InjectModel(AcademicPeriod.name) private readonly academicPeriodModel: Model<AcademicPeriod>,
    @InjectModel(Applicant.name) private readonly applicantModel: Model<Applicant>,
  ) {}

  async create(createDto: Record<string, unknown>): Promise<AdmissionPeriodDocument> {
    const id = typeof createDto.id === 'string' && createDto.id.trim() ? createDto.id : `admission-${randomUUID()}`;
    const data = await this.prepare({ ...createDto, id });
    try {
      return await new this.admissionPeriodModel(data).save();
    } catch (error) {
      this.rethrowDuplicate(error);
      throw error;
    }
  }

  async findAll(): Promise<AdmissionPeriodDocument[]> {
    return this.admissionPeriodModel.find().sort({ preEnrollmentStartDate: -1 }).exec();
  }

  async findOne(id: string): Promise<AdmissionPeriodDocument> {
    const period = await this.admissionPeriodModel.findOne(this.filter(id)).exec();
    if (!period) throw new NotFoundException(`Período de admisión ${id} no encontrado`);
    return period;
  }

  async update(id: string, updateDto: Record<string, unknown>): Promise<AdmissionPeriodDocument> {
    const existing = await this.findOne(id);
    if (updateDto.id && updateDto.id !== existing.id) throw new BadRequestException('No se puede cambiar el ID de la convocatoria');
    if (updateDto.academicPeriodId && updateDto.academicPeriodId !== existing.academicPeriodId) {
      throw new BadRequestException('No se puede cambiar el período académico vinculado');
    }
    const { _id, __v, createdAt, updatedAt, ...current } = existing.toObject();
    const data = await this.prepare({ ...current, ...updateDto, id: existing.id }, existing.id);
    try {
      const updated = await this.admissionPeriodModel.findOneAndUpdate(
        { _id: existing._id }, data, { returnDocument: 'after', runValidators: true },
      ).exec();
      if (!updated) throw new NotFoundException(`Período de admisión ${id} no encontrado`);
      return updated;
    } catch (error) {
      this.rethrowDuplicate(error);
      throw error;
    }
  }

  async remove(id: string): Promise<{ success: boolean }> {
    const period = await this.findOne(id);
    if (await this.applicantModel.exists({ periodId: period.id })) {
      throw new ConflictException('No se puede eliminar una convocatoria con postulantes registrados');
    }
    await this.admissionPeriodModel.deleteOne({ _id: period._id }).exec();
    return { success: true };
  }

  private async prepare(input: Record<string, unknown>, currentId?: string): Promise<Record<string, unknown>> {
    const academicPeriodId = input.academicPeriodId;
    if (typeof academicPeriodId !== 'string' || !academicPeriodId.trim()) {
      throw new BadRequestException('Seleccione un período académico registrado en MPA');
    }
    const academic = await this.academicPeriodModel.findOne({ id: academicPeriodId }).lean().exec();
    if (!academic) throw new BadRequestException('El período académico no existe en MPA');
    if (academic.status === 'Cerrado') throw new BadRequestException('No se puede usar un período académico cerrado');

    const otherForAcademic = await this.admissionPeriodModel.exists({
      academicPeriodId, ...(currentId ? { id: { $ne: currentId } } : {}),
    });
    if (otherForAcademic) throw new ConflictException('Este período académico ya tiene una convocatoria de admisión');

    const status = input.status ?? 'PENDIENTE';
    if (typeof status !== 'string' || !STATUSES.has(status)) throw new BadRequestException('Estado de admisión inválido');
    if (status === 'APERTURADO') {
      const otherOpen = await this.admissionPeriodModel.exists({
        status: 'APERTURADO', ...(currentId ? { id: { $ne: currentId } } : {}),
      });
      if (otherOpen) throw new ConflictException('Cierre la convocatoria abierta antes de aperturar otra');
    }

    const dates = DATE_FIELDS.map(field => input[field]);
    if (dates.some(value => !this.validDate(value)) || !this.validDate(academic.startDate)) {
      throw new BadRequestException('Todas las fechas deben tener formato AAAA-MM-DD y ser válidas');
    }
    const sequence = [...dates, academic.startDate as string] as string[];
    if (sequence.some((date, index) => index > 0 && date < sequence[index - 1])) {
      throw new BadRequestException('Orden de fechas inválido: preinscripción, examen, resultados, matrícula e inicio de clases');
    }

    return {
      ...input,
      name: academic.name,
      academicPeriodId,
      status,
      isActive: status === 'APERTURADO',
      classesStartDate: academic.startDate,
    };
  }

  private validDate(value: unknown): value is string {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }

  private filter(id: string) {
    return Types.ObjectId.isValid(id) ? { $or: [{ _id: id }, { id }] } : { id };
  }

  private rethrowDuplicate(error: unknown): void {
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      throw new ConflictException('Ya existe una convocatoria para este período o una convocatoria abierta');
    }
  }
}
