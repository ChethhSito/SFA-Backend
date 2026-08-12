import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GraduationsService } from './graduations.service';
import { GraduationsController } from './graduations.controller';
import { Graduation, GraduationSchema } from './schemas/graduation.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Graduation.name, schema: GraduationSchema }]),
  ],
  controllers: [GraduationsController],
  providers: [GraduationsService],
  exports: [GraduationsService],
})
export class GraduationsModule {}
