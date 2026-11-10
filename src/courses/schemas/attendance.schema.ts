import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AttendanceDocument = Attendance & Document;

@Schema({ timestamps: true, minimize: false })
export class Attendance {
  @Prop({ required: true })
  courseId: string;

  @Prop({ required: true })
  date: string;

  @Prop({ min: 1, max: 52 })
  week?: number;

  @Prop({ type: Object, default: {} })
  statusMap: Record<string, string>;

  @Prop() programmingId?: string;
  @Prop() groupId?: string;
  @Prop() periodId?: string;
  @Prop() courseName?: string;
  @Prop() courseCode?: string;
  @Prop() groupName?: string;
  @Prop() startTime?: string;
  @Prop() endTime?: string;
  @Prop() sessionType?: string;
  @Prop() teacherName?: string;
  @Prop() teacherDni?: string;
  @Prop({ default: 0 }) revision?: number;
  @Prop() registeredAt?: Date;
  @Prop() lastSavedBy?: string;
  @Prop() classroomName?: string;
  @Prop({ default: false }) extraordinary?: boolean;
  @Prop() reason?: string;
  @Prop({ type: [{ _id: false, dni: String, name: String, lastName: String }] })
  roster?: { dni: string; name: string; lastName: string }[];
}

export const AttendanceSchema = SchemaFactory.createForClass(Attendance);
AttendanceSchema.index({ programmingId: 1, date: 1 }, {
  unique: true, partialFilterExpression: { programmingId: { $type: 'string' } }, name: 'unique_programmed_attendance_session',
});
