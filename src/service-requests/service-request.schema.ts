import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ServiceRequestDocument = ServiceRequest & Document;

@Schema({ timestamps: true, collection: 'service_requests' })
export class ServiceRequest {
  @Prop({ required: true, unique: true, index: true })
  id: string;

  @Prop({ default: '', index: true })
  studentDni: string;

  @Prop({ default: '', index: true })
  teacherDni?: string;

  @Prop({ required: true })
  studentName: string;

  @Prop({ required: true, enum: ['ADM01', 'MAT01', 'CER01', 'CON01', 'SUB01', 'CAR01', 'DOC01', 'DOC02'] })
  conceptCode: string;

  @Prop({ required: true })
  conceptName: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ default: '' })
  period: string;

  @Prop({ required: true, enum: ['estudiante', 'docente', 'llamada_apoderado'] })
  source: string;

  @Prop({ default: '' })
  requestedBy?: string;

  @Prop({ default: '' })
  contactPhone?: string;

  @Prop({ default: '' })
  reason: string;

  @Prop({ required: true, enum: ['Pendiente', 'En Proceso', 'Validado', 'Observado'] })
  status: string;

  @Prop({ default: '' })
  paymentOperation?: string;

  @Prop()
  voucherRegisteredAt?: Date;

  @Prop({ default: '' })
  paymentDate?: string;

  @Prop({ default: 0 })
  amountPaid?: number;

  @Prop({ default: '' })
  bankName?: string;

  @Prop({ default: 'Pendiente', enum: ['Pendiente', 'Emitido'] })
  deliveryStatus?: string;

  @Prop({ default: '' })
  resultFileName?: string;

  @Prop({ type: Buffer, select: false })
  resultPdf?: Buffer;
}

export const ServiceRequestSchema = SchemaFactory.createForClass(ServiceRequest);
