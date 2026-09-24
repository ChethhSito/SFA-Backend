import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AttendanceDocument = Attendance & Document;

@Schema({ timestamps: true })
export class Attendance {
  @Prop({ required: true })
  courseId: string;

  @Prop({ required: true })
  date: string;

  @Prop({ type: Object, default: {} })
  statusMap: Record<string, string>;
}

export const AttendanceSchema = SchemaFactory.createForClass(Attendance);
