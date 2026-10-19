import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AcademicAlertsService } from './academic-alerts.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService, private readonly alertsService: AcademicAlertsService) {}

  @Get('attrition-risk')
  getAttritionRisk() {
    return this.analyticsService.calculateAttritionRisk();
  }

  @Post('tutoring/refer')
  referToTutoring(@Body() body: { studentDni: string; reason?: string }) {
    return this.analyticsService.referStudentToTutoring(body.studentDni, body.reason);
  }

  @Get('tutoring/referrals')
  listReferrals() {
    return this.analyticsService.listTutoringReferrals();
  }

  @Patch('tutoring/referrals/:studentDni/read')
  markRead(@Param('studentDni') studentDni: string) {
    return this.analyticsService.markTutoringReferralRead(studentDni);
  }

  @Patch('tutoring/referrals/:studentDni/case')
  updateCase(@Param('studentDni') dni: string, @Body() body: { status: string; responsible: string; note: string; revision: number }) {
    return this.analyticsService.updateTutoringCase(dni, body);
  }

  @Get('alerts')
  listAlerts() { return this.alertsService.list(); }

  @Post('alerts/refresh')
  refreshAlerts() { return this.alertsService.refresh(); }

  @Patch('alerts/:key/read')
  readAlert(@Param('key') key: string, @Body() body: { detectedAt: string }) { return this.alertsService.markRead(key, body.detectedAt); }
}
