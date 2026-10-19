import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
export type AcademicAlertDocument = HydratedDocument<AcademicAlert>;

@Schema({ timestamps: true })
export class AcademicAlert {
  @Prop({ required: true, unique: true, index: true }) key: string;
  @Prop({ required: true, index: true }) studentDni: string;
  @Prop({ required: true }) studentName: string;
  @Prop({ required: true, enum: ['ASISTENCIA', 'NOTAS'] }) kind: string;
  @Prop({ required: true, enum: ['CRITICO', 'MODERADO'] }) level: string;
  @Prop({ required: true }) value: number;
  @Prop({ required: true }) message: string;
  @Prop({ default: true }) active: boolean;
  @Prop({ type: Date, default: null }) readAt: Date | null;
  @Prop({ required: true }) detectedAt: Date;
  @Prop({ required: true }) evaluatedAt: Date;
  @Prop({ type: Date, default: null }) resolvedAt: Date | null;
  @Prop({ default: '', enum: ['', 'RECUPERADO', 'SIN_DATOS', 'INACTIVO'] }) resolutionReason: string;
}
export const AcademicAlertSchema = SchemaFactory.createForClass(AcademicAlert);
