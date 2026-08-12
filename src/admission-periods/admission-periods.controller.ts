import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { AdmissionPeriodsService } from './admission-periods.service';
import { AuthGuard } from '../auth/guards/auth.guard';

@Controller('admission-periods')
export class AdmissionPeriodsController {
  constructor(private readonly admissionPeriodsService: AdmissionPeriodsService) {}

  @Post()
  @UseGuards(AuthGuard)
  create(@Body() createDto: any) {
    return this.admissionPeriodsService.create(createDto);
  }

  @Get()
  findAll() {
    return this.admissionPeriodsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.admissionPeriodsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  update(@Param('id') id: string, @Body() updateDto: any) {
    return this.admissionPeriodsService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@Param('id') id: string) {
    return this.admissionPeriodsService.remove(id);
  }
}
