import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AttendanceSessionsService } from './attendance-sessions.service';
import { AuthGuard } from '../auth/guards/auth.guard';
@Controller('attendance-sessions')
@UseGuards(AuthGuard)
export class AttendanceSessionsController {
  constructor(private service: AttendanceSessionsService) {}
  @Get('programming') async programming(@Req() request: any) { return this.service.programming(await this.service.resolveActor(request.user)); }
  @Get() async list(@Req() request: any) { return this.service.list(await this.service.resolveActor(request.user)); }
  @Post() async create(@Req() request: any, @Body() body: { programmingId?: string; date?: string; extraordinary?: boolean; reason?: string }) { return this.service.create(body, await this.service.resolveActor(request.user)); }
  @Patch(':id/marks') async mark(@Req() request: any, @Param('id') id: string, @Body() body: { statusMap: Record<string, string>; revision: number }) { return this.service.mark(id, body.statusMap, await this.service.resolveActor(request.user), body.revision); }
}
