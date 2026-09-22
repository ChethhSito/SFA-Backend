import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ApplicantsModule } from './applicants/applicants.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { StudentsModule } from './students/students.module';
import { CoursesModule } from './courses/courses.module';
import { TeachersModule } from './teachers/teachers.module';
import { AdmissionPeriodsModule } from './admission-periods/admission-periods.module';
import { GraduationsModule } from './graduations/graduations.module';
import { PaymentsModule } from './payments/payments.module';
import { MailModule } from './mail/mail.module';
import { MpaModule } from './mpa/mpa.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    ApplicantsModule,
    EnrollmentsModule,
    StudentsModule,
    CoursesModule,
    TeachersModule,
    AdmissionPeriodsModule,
    GraduationsModule,
    PaymentsModule,
    MailModule,
    MpaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
