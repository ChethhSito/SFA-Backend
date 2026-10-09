import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApplicantsService } from './applicants.service';
import { ApplicantsController } from './applicants.controller';
import { Applicant, ApplicantSchema } from './schemas/applicant.schema';
import { AdmissionPeriod, AdmissionPeriodSchema } from '../admission-periods/schemas/admission-period.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Applicant.name, schema: ApplicantSchema },
      { name: AdmissionPeriod.name, schema: AdmissionPeriodSchema },
    ]),
  ],
  controllers: [ApplicantsController],
  providers: [ApplicantsService],
  exports: [ApplicantsService],
})
export class ApplicantsModule {}
