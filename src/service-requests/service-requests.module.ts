import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Student, StudentSchema } from '../students/schemas/student.schema';
import { ServiceRequest, ServiceRequestSchema } from './service-request.schema';
import { ServiceRequestsController } from './service-requests.controller';
import { ServiceRequestsService } from './service-requests.service';

@Module({
  imports: [MongooseModule.forFeature([
    { name: Student.name, schema: StudentSchema },
    { name: ServiceRequest.name, schema: ServiceRequestSchema },
  ])],
  controllers: [ServiceRequestsController],
  providers: [ServiceRequestsService],
})
export class ServiceRequestsModule {}
