import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('attrition-risk')
  getAttritionRisk() {
    return this.analyticsService.calculateAttritionRisk();
  }

  @Post('tutoring/refer')
  referToTutoring(@Body() body: { studentDni: string; reason?: string }) {
    return this.analyticsService.referStudentToTutoring(body.studentDni, body.reason);
  }
}
