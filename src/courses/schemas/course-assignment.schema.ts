import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CourseAssignmentDocument = CourseAssignment & Document;

@Schema({ timestamps: true })
export class CourseAssignment {
  @Prop({ required: true })
  courseId: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  dueDate: string;

  @Prop({ type: Array, default: [] })
  submissions: Array<{
    studentDni: string;
    studentName: string;
    fileName: string;
    submitDate: string;
    grade?: number;
  }>;
}

export const CourseAssignmentSchema = SchemaFactory.createForClass(CourseAssignment);
