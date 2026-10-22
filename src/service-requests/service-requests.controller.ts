import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ServiceRequestsService } from './service-requests.service';

@Controller('service-requests')
export class ServiceRequestsController {
  constructor(private readonly service: ServiceRequestsService) {}

  @Get()
  list(@Query('studentDni') studentDni?: string) {
    return this.service.list(studentDni);
  }

  @Post()
  create(@Body() body: Parameters<ServiceRequestsService['create']>[0]) {
    return this.service.create(body);
  }

  @Post(':id/voucher')
  submitVoucher(@Param('id') id: string, @Body() body: Parameters<ServiceRequestsService['submitVoucher']>[1]) {
    return this.service.submitVoucher(id, body);
  }

  @Patch(':id/payment')
  updatePayment(@Param('id') id: string, @Body() body: Parameters<ServiceRequestsService['updatePayment']>[1]) {
    return this.service.updatePayment(id, body);
  }
}
