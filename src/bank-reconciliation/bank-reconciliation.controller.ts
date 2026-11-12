import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { BankReconciliationService } from './bank-reconciliation.service';
import { MafSessionGuard } from '../users/staff-session.guard';

@Controller('bank-reconciliation')
export class BankReconciliationController {
  constructor(private readonly service: BankReconciliationService) {}

  @Post('preview')
  @UseGuards(MafSessionGuard)
  preview(@Body() body: unknown) {
    return this.service.preview(body);
  }

  @Post('confirm')
  @UseGuards(MafSessionGuard)
  confirm(@Body() body: unknown) {
    return this.service.confirm(body);
  }

  @Get('history')
  @UseGuards(MafSessionGuard)
  history() {
    return this.service.listImports();
  }

  @Get('file/:fingerprint')
  @UseGuards(MafSessionGuard)
  getFile(@Param('fingerprint') fingerprint: string) {
    return this.service.getFile(fingerprint);
  }
}
