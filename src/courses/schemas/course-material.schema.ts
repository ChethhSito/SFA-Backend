import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CourseMaterialDocument = CourseMaterial & Document;

@Schema({ timestamps: true })
export class CourseMaterial {
  @Prop({ required: true })
  courseId: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  fileName: string;

  @Prop({ required: true })
  date: string;
}

export const CourseMaterialSchema = SchemaFactory.createForClass(CourseMaterial);
