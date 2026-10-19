import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { Student, StudentSchema } from '../students/schemas/student.schema';
import { Enrollment, EnrollmentSchema } from '../enrollments/schemas/enrollment.schema';
import { Attendance, AttendanceSchema } from '../courses/schemas/attendance.schema';
import { CourseAssignment, CourseAssignmentSchema } from '../courses/schemas/course-assignment.schema';
import { AcademicProgram, AcademicProgramSchema } from '../mpa/schemas/academic-planning.schemas';
import { TutoringReferral, TutoringReferralSchema } from './schemas/tutoring-referral.schema';
import { AcademicAlert, AcademicAlertSchema } from './schemas/academic-alert.schema';
import { AcademicAlertsService } from './academic-alerts.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Student.name, schema: StudentSchema },
      { name: Enrollment.name, schema: EnrollmentSchema },
      { name: Attendance.name, schema: AttendanceSchema },
      { name: CourseAssignment.name, schema: CourseAssignmentSchema },
      { name: AcademicProgram.name, schema: AcademicProgramSchema },
      { name: TutoringReferral.name, schema: TutoringReferralSchema },
      { name: AcademicAlert.name, schema: AcademicAlertSchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AcademicAlertsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
