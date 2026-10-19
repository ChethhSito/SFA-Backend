import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
    this.validateReview(createDto);
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
    this.validateStatus(updateDto);
    if (updateDto.status === 'Apto') {
      const current = await this.findByDni(studentDni);
      this.validateReview({ status: 'Apto', docsChecked: updateDto.docsChecked || current.docsChecked });
    }
    const { _id, id, ...cleanData } = updateDto;
    const updated = await this.graduationModel
      .findOneAndUpdate({ studentDni }, { $set: cleanData }, { returnDocument: 'after' })
      .exec();
    if (!updated) {
      throw new NotFoundException(`Graduation record for DNI ${studentDni} not found`);
    }
    return updated;
  }

  async remove(studentDni: string): Promise<any> {
    return this.graduationModel.deleteOne({ studentDni }).exec();
  }

  private validateReview(data: any) {
    this.validateStatus(data);
    const keys = ['solicitud', 'constanciaEgresado', 'practicasPre', 'pagoDerecho'];
    if (data.status === 'Apto' && !keys.every((key) => data.docsChecked?.[key] === true)) {
      throw new BadRequestException('Debe revisar todos los requisitos antes de marcar el expediente apto.');
    }
  }

  private validateStatus(data: any) {
    if (data.status !== undefined && !['Solicitado', 'En Proceso', 'Apto', 'No Apto'].includes(data.status)) {
      throw new BadRequestException('La emisión requiere registrar el PDF en Certificados. No puede declararse desde la revisión documental.');
    }
  }
}
