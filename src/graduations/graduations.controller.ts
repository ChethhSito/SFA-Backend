import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { GraduationsService } from './graduations.service';
import { AuthGuard } from '../auth/guards/auth.guard';

@Controller('graduations')
@UseGuards(AuthGuard)
export class GraduationsController {
  constructor(private readonly graduationsService: GraduationsService) {}

  @Post()
  create(@Body() createDto: any) {
    return this.graduationsService.create(createDto);
  }

  @Get()
  findAll() {
    return this.graduationsService.findAll();
  }

  @Get(':studentDni')
  findOne(@Param('studentDni') studentDni: string) {
    return this.graduationsService.findByDni(studentDni);
  }

  @Patch(':studentDni')
  update(@Param('studentDni') studentDni: string, @Body() updateDto: any) {
    return this.graduationsService.update(studentDni, updateDto);
  }

  @Delete(':studentDni')
  remove(@Param('studentDni') studentDni: string) {
    return this.graduationsService.remove(studentDni);
  }
}
