import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TutoringReferralDocument = HydratedDocument<TutoringReferral>;

@Schema({ timestamps: true })
export class TutoringReferral {
  @Prop({ required: true, unique: true, index: true })
  studentDni: string;

  @Prop({ required: true })
  studentName: string;

  @Prop({ required: true, maxlength: 2000 })
  reason: string;

  @Prop({ required: true })
  registeredAt: Date;

  @Prop({ type: Date, default: null })
  readAt: Date | null;

  @Prop({ enum: ['PENDIENTE', 'EN_ATENCION', 'CERRADO'], default: 'PENDIENTE' })
  status: string;

  @Prop({ default: '' })
  responsible: string;

  @Prop({ type: Date, default: null })
  closedAt: Date | null;

  @Prop({ default: 0 })
  revision: number;

  @Prop({ type: Array, default: [] })
  history: { status: string; note: string; responsible: string; date: Date }[];
}

export const TutoringReferralSchema = SchemaFactory.createForClass(TutoringReferral);
