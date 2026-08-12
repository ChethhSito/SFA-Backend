import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { TeachersService } from './teachers.service';
import { AuthGuard } from '../auth/guards/auth.guard';

@Controller('teachers')
@UseGuards(AuthGuard)
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Post()
  create(@Body() createTeacherDto: any) {
    return this.teachersService.create(createTeacherDto);
  }

  @Get()
  findAll() {
    return this.teachersService.findAll();
  }

  @Get(':dni')
  findOne(@Param('dni') dni: string) {
    return this.teachersService.findByDni(dni);
  }

  @Patch(':dni')
  update(@Param('dni') dni: string, @Body() updateTeacherDto: any) {
    return this.teachersService.update(dni, updateTeacherDto);
  }

  @Delete(':dni')
  remove(@Param('dni') dni: string) {
    return this.teachersService.remove(dni);
  }
}
