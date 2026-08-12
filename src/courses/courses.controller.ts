import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { AuthGuard } from '../auth/guards/auth.guard';

@Controller('courses')
@UseGuards(AuthGuard)
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  create(@Body() createCourseDto: any) {
    return this.coursesService.create(createCourseDto);
  }

  @Get()
  findAll() {
    return this.coursesService.findAll();
  }

  @Get(':code')
  findOne(@Param('code') code: string) {
    return this.coursesService.findByCode(code);
  }

  @Patch(':code')
  update(@Param('code') code: string, @Body() updateCourseDto: any) {
    return this.coursesService.update(code, updateCourseDto);
  }

  @Delete(':code')
  remove(@Param('code') code: string) {
    return this.coursesService.remove(code);
  }
}
