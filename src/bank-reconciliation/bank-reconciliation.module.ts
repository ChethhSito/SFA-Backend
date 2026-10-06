import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BankImport, BankImportSchema } from './bank-import.schema';
import { BankReconciliationController } from './bank-reconciliation.controller';
import { BankReconciliationService } from './bank-reconciliation.service';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schema';

@Module({
  imports: [MongooseModule.forFeature([
    { name: BankImport.name, schema: BankImportSchema },
    { name: Payment.name, schema: PaymentSchema },
  ])],
  controllers: [BankReconciliationController],
  providers: [BankReconciliationService],
})
export class BankReconciliationModule {}
