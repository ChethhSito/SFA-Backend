import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CourseEvidenceDocument = CourseEvidence & Document;

@Schema({ timestamps: true })
export class CourseEvidence {
  @Prop({ required: true }) courseId: string;
  @Prop({ required: true, min: 1, max: 16 }) week: number;
  @Prop({ required: true, enum: ['Fotografia', 'Reporte', 'Laboratorio', 'Actividad'] }) category: string;
  @Prop({ required: true }) title: string;
  @Prop({ required: true }) fileName: string;
  @Prop({ required: true }) storedFileName: string;
  @Prop({ required: true }) mimeType: string;
  @Prop({ required: true }) fileSize: number;
  @Prop({ required: true }) date: string;
}

export const CourseEvidenceSchema = SchemaFactory.createForClass(CourseEvidence);
