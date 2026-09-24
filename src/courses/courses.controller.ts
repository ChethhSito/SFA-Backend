import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
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

  // --- ATTENDANCE ENDPOINTS ---
  @Get('attendance/:courseId')
  getAttendance(@Param('courseId') courseId: string) {
    return this.coursesService.getAttendance(courseId);
  }

  @Post('attendance/:courseId')
  saveAttendance(
    @Param('courseId') courseId: string,
    @Body() body: { date: string; statusMap: Record<string, string> },
  ) {
    return this.coursesService.saveAttendance(courseId, body.date, body.statusMap);
  }

  // --- MATERIALS ENDPOINTS ---
  @Get('materials/list')
  getMaterials(@Query('courseId') courseId?: string) {
    return this.coursesService.getMaterials(courseId);
  }

  @Post('materials/upload')
  saveMaterial(
    @Body() body: { courseId: string; title: string; fileName: string; date: string },
  ) {
    return this.coursesService.saveMaterial(body);
  }

  // --- ASSIGNMENTS ENDPOINTS ---
  @Get('assignments/list')
  getAssignments(@Query('courseId') courseId?: string) {
    return this.coursesService.getAssignments(courseId);
  }

  @Post('assignments/create')
  saveAssignment(
    @Body() body: { courseId: string; title: string; description: string; dueDate: string },
  ) {
    return this.coursesService.saveAssignment(body);
  }

  @Post('assignments/:id/submit')
  submitAssignment(
    @Param('id') id: string,
    @Body() body: { studentDni: string; studentName: string; fileName: string; submitDate: string; grade?: number },
  ) {
    return this.coursesService.submitAssignment(id, body);
  }

  @Post(':code/close-grades')
  closeCourseGrades(
    @Param('code') code: string,
    @Body() body: { teacherDni: string },
  ) {
    return this.coursesService.closeCourseGrades(code, body.teacherDni);
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
