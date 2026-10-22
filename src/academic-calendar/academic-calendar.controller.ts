import { Body, Controller, Delete, Get, Param, Put, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AcademicCalendarService } from './academic-calendar.service';
import { CalendarEvent } from './academic-calendar.schema';

@Controller('academic-calendar')
export class AcademicCalendarController {
  constructor(private readonly service: AcademicCalendarService) {}

  @Get(':periodId') get(@Param('periodId') periodId: string) { return this.service.get(periodId); }

  @Get(':periodId/image')
  async getImage(@Param('periodId') periodId: string, @Res() response: Response) {
    const image = await this.service.getImage(periodId);
    response.type(image.mimeType).setHeader('Cache-Control', 'no-store').send(image.data);
  }

  @Put(':periodId/events')
  saveEvents(@Param('periodId') periodId: string, @Body() body: { events: CalendarEvent[] }) {
    return this.service.saveEvents(periodId, body?.events);
  }

  @Put(':periodId/image')
  saveImage(@Param('periodId') periodId: string, @Body() body: { fileName: string; mimeType: string; contentBase64: string }) {
    return this.service.saveImage(periodId, body);
  }

  @Delete(':periodId/image') deleteImage(@Param('periodId') periodId: string) { return this.service.deleteImage(periodId); }
}
