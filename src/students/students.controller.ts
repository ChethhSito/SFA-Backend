import { Controller, Get, Post, Put, Body, Param } from '@nestjs/common';
import { StudentsService } from './students.service';
import { UpdateStudentPersonalDto } from './dto/update-student-personal.dto';
import { Student } from './schemas/student.schema';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  async findAll(): Promise<Student[]> {
    return this.studentsService.findAll();
  }

  @Get(':dni')
  async findByDni(@Param('dni') dni: string): Promise<Student> {
    return this.studentsService.findByDni(dni);
  }

  @Post()
  async createOrUpdate(@Body() studentData: Partial<Student>): Promise<Student> {
    return this.studentsService.createOrUpdate(studentData);
  }

  @Put(':dni/personal-data')
  async updatePersonalData(
    @Param('dni') dni: string,
    @Body() dto: UpdateStudentPersonalDto,
  ): Promise<Student> {
    return this.studentsService.updatePersonalData(dni, dto);
  }

  @Put(':dni/cycle-status')
  async updateCycleStatuses(
    @Param('dni') dni: string,
    @Body() body: { cycleStatuses: any[] },
  ): Promise<Student> {
    return this.studentsService.updateCycleStatuses(dni, body.cycleStatuses);
  }
}
