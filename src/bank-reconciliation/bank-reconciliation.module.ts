import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BankImport, BankImportSchema } from './bank-import.schema';
import { BankReconciliationController } from './bank-reconciliation.controller';
import { BankReconciliationService } from './bank-reconciliation.service';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schema';
import { Applicant, ApplicantSchema } from '../applicants/schemas/applicant.schema';
import { Enrollment, EnrollmentSchema } from '../enrollments/schemas/enrollment.schema';
import { ServiceRequest, ServiceRequestSchema } from '../service-requests/service-request.schema';
import { AcademicGroup, AcademicGroupSchema } from '../mpa/schemas/academic-planning.schemas';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule, MongooseModule.forFeature([
    { name: BankImport.name, schema: BankImportSchema },
    { name: Payment.name, schema: PaymentSchema },
    { name: Applicant.name, schema: ApplicantSchema },
    { name: Enrollment.name, schema: EnrollmentSchema },
    { name: ServiceRequest.name, schema: ServiceRequestSchema },
    { name: AcademicGroup.name, schema: AcademicGroupSchema },
  ])],
  controllers: [BankReconciliationController],
  providers: [BankReconciliationService],
})
export class BankReconciliationModule {}
