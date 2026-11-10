import { Body, Controller, Get, Param, Patch, Post, Query, UploadedFile, UseInterceptors, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ServiceRequestsService } from './service-requests.service';

@Controller('service-requests')
export class ServiceRequestsController {
  constructor(private readonly service: ServiceRequestsService) {}

  @Get()
  list(@Query('studentDni') studentDni?: string, @Query('teacherDni') teacherDni?: string) {
    return this.service.list(studentDni, teacherDni);
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

  @Post(':id/result')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5_000_000 } }))
  deliverResult(@Param('id') id: string, @UploadedFile() file: { mimetype: string; buffer: Buffer; originalname: string }) {
    return this.service.deliverResult(id, file);
  }

  @Get(':id/result')
  async resultPdf(@Param('id') id: string, @Query('dni') dni: string, @Res() response: Response) {
    const result = await this.service.resultPdf(id, dni);
    response.type('application/pdf').setHeader('Content-Disposition', `attachment; filename="${result.name.replace(/[^a-zA-Z0-9._-]/g, '_')}"`).send(result.data);
  }
}
