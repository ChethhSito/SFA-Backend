import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ collection: 'academic_periods', timestamps: true })
export class AcademicPeriod {
  @Prop({ required: true, unique: true }) id: string;
  @Prop({ required: true }) name: string;
  @Prop({ required: true }) startDate: string;
  @Prop({ required: true }) endDate: string;
  @Prop({ required: true, default: false }) isActive: boolean;
  @Prop({ enum: ['Planificación', 'Activo', 'Cerrado'] }) status?: string;
}
export const AcademicPeriodSchema = SchemaFactory.createForClass(AcademicPeriod);
AcademicPeriodSchema.index({ isActive: 1 });

@Schema({ collection: 'careers', timestamps: true })
export class AcademicProgram {
  @Prop({ required: true, unique: true }) id: string;
  @Prop({ required: true, unique: true }) code: string;
  @Prop({ required: true }) name: string;
  @Prop({ required: true, min: 1 }) durationSemesters: number;
  @Prop() description?: string;
  @Prop({ enum: ['Activo', 'Inactivo'] }) status?: string;
}
export const AcademicProgramSchema = SchemaFactory.createForClass(AcademicProgram);

@Schema({ collection: 'academic_courses', timestamps: true })
export class AcademicCourse {
  @Prop({ required: true, unique: true }) id: string;
  @Prop({ required: true, unique: true }) code: string;
  @Prop({ required: true }) name: string;
  @Prop({ required: true, min: 0 }) credits: number;
  @Prop({ min: 0 }) theoryHours?: number;
  @Prop({ min: 0 }) labHours?: number;
  @Prop({ enum: ['Activo', 'Inactivo'] }) status?: string;
  @Prop({ index: true }) careerId?: string;
  @Prop({ min: 1 }) referenceCycle?: number;
  @Prop({ enum: ['General', 'Especialidad'] }) type?: string;
}
export const AcademicCourseSchema = SchemaFactory.createForClass(AcademicCourse);

@Schema({ collection: 'curriculum_versions', timestamps: true })
export class CurriculumVersion {
  @Prop({ required: true, unique: true }) id: string;
  @Prop({ required: true }) name: string;
  @Prop({ required: true, index: true }) careerId: string;
  @Prop({ required: true, default: false }) isActive: boolean;
  @Prop({ enum: ['Activa', 'Inactiva', 'Borrador'] }) status?: string;
  @Prop() created?: string;
}
export const CurriculumVersionSchema = SchemaFactory.createForClass(CurriculumVersion);

@Schema({ collection: 'curriculum_items', timestamps: true })
export class CurriculumItem {
  @Prop({ required: true, unique: true }) id: string;
  @Prop({ required: true, index: true }) careerId: string;
  @Prop({ required: true, index: true }) courseId: string;
  @Prop({ required: true, min: 1 }) cycle: number;
  @Prop({ index: true }) versionId?: string;
}
export const CurriculumItemSchema = SchemaFactory.createForClass(CurriculumItem);
CurriculumItemSchema.index({ versionId: 1, cycle: 1 });

@Schema({ collection: 'academic_teachers', timestamps: true })
export class AcademicTeacher {
  @Prop({ required: true, unique: true }) dni: string;
  @Prop({ required: true }) name: string;
  @Prop({ required: true }) lastName: string;
  @Prop({ index: true }) email?: string;
  @Prop() specialty?: string;
  @Prop({ type: [String], default: [] }) specialties?: string[];
  @Prop() status?: string;
  @Prop({ index: true }) careerId?: string;
}
export const AcademicTeacherSchema = SchemaFactory.createForClass(AcademicTeacher);

@Schema({ collection: 'classrooms', timestamps: true })
export class Classroom {
  @Prop({ required: true, unique: true }) id: string;
  @Prop({ required: true }) name: string;
  @Prop({ required: true, enum: ['Teoría', 'Laboratorio'] }) type: string;
  @Prop({ required: true }) location: string;
  @Prop({ required: true, min: 1 }) capacity: number;
  @Prop({ index: true }) careerId?: string;
}
export const ClassroomSchema = SchemaFactory.createForClass(Classroom);

@Schema({ collection: 'academic_shifts', timestamps: true })
export class AcademicShift {
  @Prop({ required: true, unique: true }) id: string;
  @Prop({ required: true }) name: string;
  @Prop({ required: true }) startTime: string;
  @Prop({ required: true }) endTime: string;
}
export const AcademicShiftSchema = SchemaFactory.createForClass(AcademicShift);

@Schema({ collection: 'academic_schedules', timestamps: true })
export class AcademicSchedule {
  @Prop({ required: true, unique: true }) id: string;
  @Prop({ required: true }) dayOfWeek: string;
  @Prop() startTime?: string;
  @Prop() endTime?: string;
  @Prop({ required: true }) timeSlot: string;
  @Prop({ index: true }) shiftId?: string;
}
export const AcademicScheduleSchema = SchemaFactory.createForClass(AcademicSchedule);

@Schema({ collection: 'academic_groups', timestamps: true })
export class AcademicGroup {
  @Prop({ required: true, unique: true }) id: string;
  @Prop({ required: true }) name: string;
  @Prop({ required: true, index: true }) periodId: string;
  @Prop({ required: true, index: true }) careerId: string;
  @Prop({ required: true, min: 1 }) cycle: number;
  @Prop({ required: true, index: true }) shiftId: string;
  @Prop({ required: true, min: 1 }) capacity: number;
  @Prop({ index: true }) curriculumVersionId?: string;
}
export const AcademicGroupSchema = SchemaFactory.createForClass(AcademicGroup);
AcademicGroupSchema.index({ periodId: 1, careerId: 1, cycle: 1 });

@Schema({ collection: 'academic_programming', timestamps: true })
export class AcademicProgramming {
  @Prop({ required: true, unique: true }) id: string;
  @Prop({ required: true, index: true }) groupId: string;
  @Prop({ required: true, index: true }) courseId: string;
  @Prop({ required: true, index: true }) teacherDni: string;
  @Prop({ required: true, index: true }) classroomId: string;
  @Prop({ index: true }) scheduleId?: string;
  @Prop({ required: true, enum: ['Teoría', 'Laboratorio'] }) sessionType: string;
  @Prop() grpNum?: string;
  @Prop() subGrpNum?: string;
  @Prop({ enum: ['Teo', 'Lab', 'Tal'] }) sessionClassType?: string;
  @Prop({ required: true }) dayOfWeek: string;
  @Prop({ required: true }) startTime: string;
  @Prop({ required: true }) endTime: string;
  @Prop({ index: true }) shiftId?: string;
  @Prop({ required: true, min: 1 }) pedagogicalHours: number;
}
export const AcademicProgrammingSchema = SchemaFactory.createForClass(AcademicProgramming);
AcademicProgrammingSchema.index({ groupId: 1, dayOfWeek: 1, startTime: 1 });
AcademicProgrammingSchema.index({ teacherDni: 1, dayOfWeek: 1, startTime: 1 });
AcademicProgrammingSchema.index({ classroomId: 1, dayOfWeek: 1, startTime: 1 });
