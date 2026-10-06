import { Controller, Get, Post, Put, Body, Patch, Param, Delete, UseGuards, NotFoundException } from '@nestjs/common';
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
  findAll() {
    return this.applicantsService.findAll();
  }

  @Get(':dni')
  async findOne(@Param('dni') dni: string) {
    const applicant = await this.applicantsService.findByDni(dni);
    if (!applicant) {
      throw new NotFoundException(`Applicant with identifier ${dni} not found`);
    }
    return applicant;
  }

  @Put(':dni')
  @Patch(':dni')
  update(@Param('dni') dni: string, @Body() updateApplicantDto: any) {
    return this.applicantsService.update(dni, updateApplicantDto);
  }

  @Delete(':dni')
  @UseGuards(AuthGuard)
  remove(@Param('dni') dni: string) {
    return this.applicantsService.remove(dni);
  }
}
