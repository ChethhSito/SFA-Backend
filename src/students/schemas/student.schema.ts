import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type StudentDocument = Student & Document;

@Schema({ _id: false })
export class CourseGrade {
  @Prop({ required: true })
  name: string;

  @Prop({ default: 0 })
  grade: number;

  @Prop({ default: false })
  approved: boolean;
}

@Schema({ _id: false })
export class CycleStatusItem {
  @Prop({ required: true })
  cycleNumber: number;

  @Prop({ required: true, default: 2026 })
  year: number;

  @Prop({ default: 'Matriculado' })
  status: string;

  @Prop({ default: 0 })
  average: number;

  @Prop({ default: 24 })
  credits: number;

  @Prop({ type: [CourseGrade], default: [] })
  courses: CourseGrade[];
}

@Schema({ timestamps: true })
export class Student {
  @Prop({ required: true, unique: true, index: true })
  dni: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true })
  email: string;

  @Prop({ default: '' })
  phone: string;

  @Prop({ default: '' })
  birthDate?: string;

  @Prop({ default: 'Masculino' })
  gender?: string;

  @Prop({ default: '' })
  address?: string;

  @Prop({ default: '' })
  district?: string;

  @Prop({ default: '' })
  province?: string;

  @Prop({ default: '' })
  emergencyName?: string;

  @Prop({ default: '' })
  emergencyPhone?: string;

  @Prop({ default: '' })
  emergencyRelation?: string;

  @Prop({ type: [CycleStatusItem], default: [] })
  cycleStatuses?: CycleStatusItem[];
}

export const StudentSchema = SchemaFactory.createForClass(Student);
StudentSchema.index({ email: 1 });

