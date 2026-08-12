import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import { AuthGuard } from '../auth/guards/auth.guard';

@Controller('enrollments')
@UseGuards(AuthGuard)
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post()
  create(@Body() createEnrollmentDto: any) {
    return this.enrollmentsService.create(createEnrollmentDto);
  }

  @Get()
  findAll() {
    return this.enrollmentsService.findAll();
  }

  @Get(':studentDni')
  findOne(@Param('studentDni') studentDni: string) {
    return this.enrollmentsService.findByDni(studentDni);
  }

  @Patch(':studentDni')
  update(@Param('studentDni') studentDni: string, @Body() updateEnrollmentDto: any) {
    return this.enrollmentsService.update(studentDni, updateEnrollmentDto);
  }

  @Delete(':studentDni')
  remove(@Param('studentDni') studentDni: string) {
    return this.enrollmentsService.remove(studentDni);
  }
}
