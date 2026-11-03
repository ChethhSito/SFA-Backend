import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BankImport, BankImportSchema } from './bank-import.schema';
import { BankReconciliationController } from './bank-reconciliation.controller';
import { BankReconciliationService } from './bank-reconciliation.service';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schema';
import { Applicant, ApplicantSchema } from '../applicants/schemas/applicant.schema';
import { Enrollment, EnrollmentSchema } from '../enrollments/schemas/enrollment.schema';
import { ServiceRequest, ServiceRequestSchema } from '../service-requests/service-request.schema';

@Module({
  imports: [MongooseModule.forFeature([
    { name: BankImport.name, schema: BankImportSchema },
    { name: Payment.name, schema: PaymentSchema },
    { name: Applicant.name, schema: ApplicantSchema },
    { name: Enrollment.name, schema: EnrollmentSchema },
    { name: ServiceRequest.name, schema: ServiceRequestSchema },
  ])],
  controllers: [BankReconciliationController],
  providers: [BankReconciliationService],
})
export class BankReconciliationModule {}
