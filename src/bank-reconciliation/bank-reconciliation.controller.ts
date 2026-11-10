import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { BankReconciliationService } from './bank-reconciliation.service';

@Controller('bank-reconciliation')
export class BankReconciliationController {
  constructor(private readonly service: BankReconciliationService) {}

  @Post('preview')
  preview(@Body() body: unknown) {
    return this.service.preview(body);
  }

  @Post('confirm')
  confirm(@Body() body: unknown) {
    return this.service.confirm(body);
  }

  @Get('history')
  history() {
    return this.service.listImports();
  }

  @Get('file/:fingerprint')
  getFile(@Param('fingerprint') fingerprint: string) {
    return this.service.getFile(fingerprint);
  }
}
