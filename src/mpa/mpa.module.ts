import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MpaController } from './mpa.controller';
import { MpaService } from './mpa.service';
import {
  AcademicPeriod, AcademicPeriodSchema, AcademicProgram, AcademicProgramSchema,
  AcademicCourse, AcademicCourseSchema, CurriculumVersion, CurriculumVersionSchema,
  CurriculumItem, CurriculumItemSchema, AcademicTeacher, AcademicTeacherSchema,
  Classroom, ClassroomSchema, AcademicShift, AcademicShiftSchema,
  AcademicSchedule, AcademicScheduleSchema, AcademicGroup, AcademicGroupSchema,
  AcademicProgramming, AcademicProgrammingSchema,
} from './schemas/academic-planning.schemas';

@Module({
  imports: [MongooseModule.forFeature([
    { name: AcademicPeriod.name, schema: AcademicPeriodSchema },
    { name: AcademicProgram.name, schema: AcademicProgramSchema },
    { name: AcademicCourse.name, schema: AcademicCourseSchema },
    { name: CurriculumVersion.name, schema: CurriculumVersionSchema },
    { name: CurriculumItem.name, schema: CurriculumItemSchema },
    { name: AcademicTeacher.name, schema: AcademicTeacherSchema },
    { name: Classroom.name, schema: ClassroomSchema },
    { name: AcademicShift.name, schema: AcademicShiftSchema },
    { name: AcademicSchedule.name, schema: AcademicScheduleSchema },
    { name: AcademicGroup.name, schema: AcademicGroupSchema },
    { name: AcademicProgramming.name, schema: AcademicProgrammingSchema },
  ])],
  controllers: [MpaController],
  providers: [MpaService],
})
export class MpaModule {}
