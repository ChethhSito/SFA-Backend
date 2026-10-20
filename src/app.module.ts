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
import { AnalyticsModule } from './analytics/analytics.module';
import { BankReconciliationModule } from './bank-reconciliation/bank-reconciliation.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // 🛑 Protección Anti-Fuerza Bruta y Anti-DoS (OWASP A07)
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // Ventana de 1 minuto
        limit: 150,  // Máximo 150 peticiones por minuto por IP
      },
    ]),
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
    AnalyticsModule,
    BankReconciliationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
