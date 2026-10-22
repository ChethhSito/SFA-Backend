import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { Res } from '@nestjs/common';
import type { Response } from 'express';

@Controller('courses')
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
  @Get('attendance/list')
  getAllAttendance() {
    return this.coursesService.getAttendance();
  }

  @Get('attendance/:courseId')
  getAttendance(@Param('courseId') courseId: string) {
    return this.coursesService.getAttendance(courseId);
  }

  @Post('attendance/:courseId')
  saveAttendance(
    @Param('courseId') courseId: string,
    @Body() body: { date: string; statusMap: Record<string, string>; week?: number },
  ) {
    return this.coursesService.saveAttendance(courseId, body.date, body.statusMap, body.week);
  }

  // --- MATERIALS ENDPOINTS ---
  @Get('materials/list')
  getMaterials(@Query('courseId') courseId?: string) {
    return this.coursesService.getMaterials(courseId);
  }

  @Post('materials/upload')
  saveMaterial(@Body() body: { courseId: string; title: string; fileName: string; contentBase64: string; mimeType: string }) {
    return this.coursesService.saveMaterial(body);
  }

  @Get('materials/:id/file')
  async downloadMaterial(@Param('id') id: string, @Res() response: Response) {
    const file = await this.coursesService.getCourseFile('materials', id);
    response.type(file.mimeType).attachment(file.fileName).send(file.data);
  }

  @Delete('materials/:id')
  deleteMaterial(@Param('id') id: string) {
    return this.coursesService.deleteMaterial(id);
  }

  @Get('evidences/list')
  getEvidences(@Query('courseId') courseId: string, @Query('week') week: string) {
    return this.coursesService.getEvidences(courseId, Number(week));
  }

  @Post('evidences/upload')
  saveEvidence(@Body() body: { courseId: string; week: number; category: string; title: string; fileName: string; contentBase64: string; mimeType: string }) {
    return this.coursesService.saveEvidence(body);
  }

  @Get('evidences/:id/file')
  async downloadEvidence(@Param('id') id: string, @Res() response: Response) {
    const file = await this.coursesService.getCourseFile('evidences', id);
    response.type(file.mimeType).attachment(file.fileName).send(file.data);
  }

  @Delete('evidences/:id')
  deleteEvidence(@Param('id') id: string) {
    return this.coursesService.deleteEvidence(id);
  }

  @Get('observations/list')
  getObservations(@Query('courseId') courseId: string, @Query('week') week: string) {
    return this.coursesService.getObservations(courseId, Number(week));
  }

  @Post('observations')
  saveObservation(@Body() body: { courseId: string; week: number; type: string; text: string }) {
    return this.coursesService.saveObservation(body);
  }

  @Delete('observations/:id')
  deleteObservation(@Param('id') id: string) {
    return this.coursesService.deleteObservation(id);
  }

  // --- ASSIGNMENTS ENDPOINTS ---
  @Get('assignments/list')
  getAssignments(@Query('courseId') courseId?: string) {
    return this.coursesService.getAssignments(courseId);
  }

  @Post('assignments/create')
  saveAssignment(
    @Body() body: { courseId: string; title: string; description: string; dueDate: string; kind?: string; attachment?: string; rubric?: string; contentBase64?: string; mimeType?: string },
  ) {
    return this.coursesService.saveAssignment(body);
  }

  @Get('assignments/:id/file')
  async downloadAssignmentAttachment(@Param('id') id: string, @Res() response: Response) {
    const file = await this.coursesService.getCourseFile('assignments', id);
    response.type(file.mimeType).attachment(file.fileName).send(file.data);
  }

  @Patch('assignments/:id')
  updateAssignment(@Param('id') id: string, @Body() body: any) {
    return this.coursesService.updateAssignment(id, body);
  }

  @Delete('assignments/:id')
  @UseGuards(AuthGuard)
  deleteAssignment(@Param('id') id: string) {
    return this.coursesService.deleteAssignment(id);
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
  @UseGuards(AuthGuard)
  remove(@Param('code') code: string) {
    return this.coursesService.remove(code);
  }
}
