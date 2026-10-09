import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AdmissionPeriodDocument = AdmissionPeriod & Document;

@Schema({ timestamps: true })
export class AdmissionPeriod {
  @Prop({ required: true, unique: true })
  id: string;

  @Prop({ required: true, unique: true })
  academicPeriodId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, default: false })
  isActive: boolean;

  @Prop({ required: true, default: 'PENDIENTE', enum: ['PENDIENTE', 'APERTURADO', 'EXAMEN', 'MATRICULA', 'CERRADO'] })
  status: string;

  @Prop({ required: true })
  preEnrollmentStartDate: string;

  @Prop({ required: true })
  preEnrollmentEndDate: string;

  @Prop({ required: true })
  admissionDate: string;

  @Prop({ required: true })
  resultsPublicationDate: string;

  @Prop({ required: true })
  enrollmentStartDate: string;

  @Prop({ required: true })
  enrollmentEndDate: string;

  @Prop({ required: true })
  classesStartDate: string;
}

export const AdmissionPeriodSchema = SchemaFactory.createForClass(AdmissionPeriod);
AdmissionPeriodSchema.index({ status: 1 }, { unique: true, partialFilterExpression: { status: 'APERTURADO' } });
