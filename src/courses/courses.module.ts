import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CoursesService } from './courses.service';
import { CoursesController } from './courses.controller';
import { Course, CourseSchema } from './schemas/course.schema';
import { Attendance, AttendanceSchema } from './schemas/attendance.schema';
import { CourseMaterial, CourseMaterialSchema } from './schemas/course-material.schema';
import { CourseAssignment, CourseAssignmentSchema } from './schemas/course-assignment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Course.name, schema: CourseSchema },
      { name: Attendance.name, schema: AttendanceSchema },
      { name: CourseMaterial.name, schema: CourseMaterialSchema },
      { name: CourseAssignment.name, schema: CourseAssignmentSchema },
    ]),
  ],
  controllers: [CoursesController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
