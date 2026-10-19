import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GraduationsService } from './graduations.service';
import { GraduationsController } from './graduations.controller';
import { Graduation, GraduationSchema } from './schemas/graduation.schema';
import { Student, StudentSchema } from '../students/schemas/student.schema';
import { IssuedCertificate, IssuedCertificateSchema } from './schemas/issued-certificate.schema';
import { CertificatesService } from './certificates.service';
import { CertificatesController, CertificateVerificationController } from './certificates.controller';
import { CertificateManagementGuard } from './certificate-management.guard';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Graduation.name, schema: GraduationSchema }, { name: Student.name, schema: StudentSchema }, { name: IssuedCertificate.name, schema: IssuedCertificateSchema }]),
  ],
  controllers: [GraduationsController, CertificatesController, CertificateVerificationController],
  providers: [GraduationsService, CertificatesService, CertificateManagementGuard],
  exports: [GraduationsService],
})
export class GraduationsModule {}
