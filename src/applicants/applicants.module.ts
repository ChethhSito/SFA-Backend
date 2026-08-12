import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApplicantsService } from './applicants.service';
import { ApplicantsController } from './applicants.controller';
import { Applicant, ApplicantSchema } from './schemas/applicant.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Applicant.name, schema: ApplicantSchema }]),
  ],
  controllers: [ApplicantsController],
  providers: [ApplicantsService],
  exports: [ApplicantsService],
})
export class ApplicantsModule {}
