import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CourseDocument = Course & Document;

@Schema({ timestamps: true })
export class Course {
  @Prop({ required: true, unique: true })
  code: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, default: 0 })
  credits: number;

  @Prop({ required: true })
  classroom: string;

  @Prop({ required: true })
  schedule: string;

  @Prop({ required: true })
  teacherDni: string;

  @Prop()
  career?: string;

  @Prop()
  group?: string;

  @Prop()
  curriculum?: string;

  @Prop()
  startDate?: string;

  @Prop()
  endDate?: string;

  @Prop({ default: 0 })
  studentCount?: number;
}

export const CourseSchema = SchemaFactory.createForClass(Course);
