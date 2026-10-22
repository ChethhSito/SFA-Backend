import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class CalendarEvent {
  @Prop({ required: true }) id: string;
  @Prop({ required: true }) date: string;
  @Prop({ required: true, enum: ['Feriado', 'Actividad', 'Aviso'] }) type: string;
  @Prop({ required: true }) title: string;
  @Prop({ default: '' }) description: string;
}
export const CalendarEventSchema = SchemaFactory.createForClass(CalendarEvent);

@Schema({ collection: 'academic_calendars', timestamps: true })
export class AcademicCalendar {
  @Prop({ required: true, unique: true, index: true }) periodId: string;
  @Prop({ type: [CalendarEventSchema], default: [] }) events: CalendarEvent[];
  @Prop({ type: Buffer, select: false }) imageData?: Buffer;
  @Prop() imageMime?: string;
  @Prop() imageFileName?: string;
  @Prop() imageUpdatedAt?: Date;
}
export const AcademicCalendarSchema = SchemaFactory.createForClass(AcademicCalendar);
