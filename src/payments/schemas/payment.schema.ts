import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PaymentDocument = Payment & Document;

@Schema({ timestamps: true })
export class Payment {
  @Prop({ required: true })
  paymentId: string;

  @Prop({ required: true, index: true })
  studentDni: string;

  @Prop({ required: true })
  concept: string;

  @Prop({ required: true, type: Number })
  amount: number;

  @Prop({ required: true, default: () => new Date().toISOString().split('T')[0] })
  date: string;

  @Prop({ required: true, default: 'APROBADO' })
  status: string;

  @Prop({ default: 'EFECTIVO' })
  paymentMethod?: string;

  @Prop()
  receiptNumber?: string;

  @Prop()
  notes?: string;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
PaymentSchema.index({ studentDni: 1 });
PaymentSchema.index({ date: -1 });
