import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ApplicantsModule } from './applicants/applicants.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { CoursesModule } from './courses/courses.module';
import { TeachersModule } from './teachers/teachers.module';
import { AdmissionPeriodsModule } from './admission-periods/admission-periods.module';
import { GraduationsModule } from './graduations/graduations.module';

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
    CoursesModule,
    TeachersModule,
    AdmissionPeriodsModule,
    GraduationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}


