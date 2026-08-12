import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdmissionPeriodsService } from './admission-periods.service';
import { AdmissionPeriodsController } from './admission-periods.controller';
import { AdmissionPeriod, AdmissionPeriodSchema } from './schemas/admission-period.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: AdmissionPeriod.name, schema: AdmissionPeriodSchema }]),
  ],
  controllers: [AdmissionPeriodsController],
  providers: [AdmissionPeriodsService],
  exports: [AdmissionPeriodsService],
})
export class AdmissionPeriodsModule {}
