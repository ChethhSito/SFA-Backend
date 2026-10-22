import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CourseObservationDocument = CourseObservation & Document;

@Schema({ timestamps: true })
export class CourseObservation {
  @Prop({ required: true }) courseId: string;
  @Prop({ required: true, min: 1, max: 16 }) week: number;
  @Prop({ required: true, enum: ['General', 'Incidencia', 'Acuerdo'] }) type: string;
  @Prop({ required: true }) text: string;
  @Prop({ required: true }) date: string;
}

export const CourseObservationSchema = SchemaFactory.createForClass(CourseObservation);
