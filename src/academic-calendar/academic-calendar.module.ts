import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AcademicPeriod, AcademicPeriodSchema } from '../mpa/schemas/academic-planning.schemas';
import { AcademicCalendar, AcademicCalendarSchema } from './academic-calendar.schema';
import { AcademicCalendarController } from './academic-calendar.controller';
import { AcademicCalendarService } from './academic-calendar.service';

@Module({
  imports: [MongooseModule.forFeature([
    { name: AcademicPeriod.name, schema: AcademicPeriodSchema },
    { name: AcademicCalendar.name, schema: AcademicCalendarSchema },
  ])],
  controllers: [AcademicCalendarController],
  providers: [AcademicCalendarService],
})
export class AcademicCalendarModule {}
