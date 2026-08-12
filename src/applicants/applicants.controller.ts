import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApplicantsService } from './applicants.service';
import { AuthGuard } from '../auth/guards/auth.guard';

@Controller('applicants')
export class ApplicantsController {
  constructor(private readonly applicantsService: ApplicantsService) {}

  @Post()
  create(@Body() createApplicantDto: any) {
    return this.applicantsService.create(createApplicantDto);
  }

  @Get()
  @UseGuards(AuthGuard)
  findAll() {
    return this.applicantsService.findAll();
  }

  @Get(':dni')
  @UseGuards(AuthGuard)
  findOne(@Param('dni') dni: string) {
    return this.applicantsService.findByDni(dni);
  }

  @Patch(':dni')
  @UseGuards(AuthGuard)
  update(@Param('dni') dni: string, @Body() updateApplicantDto: any) {
    return this.applicantsService.update(dni, updateApplicantDto);
  }

  @Delete(':dni')
  @UseGuards(AuthGuard)
  remove(@Param('dni') dni: string) {
    return this.applicantsService.remove(dni);
  }
}
