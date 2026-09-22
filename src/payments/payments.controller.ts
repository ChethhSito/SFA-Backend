import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Payment } from './schemas/payment.schema';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  async findAll(): Promise<Payment[]> {
    return this.paymentsService.findAll();
  }

  @Get('student/:dni')
  async findByStudentDni(@Param('dni') studentDni: string): Promise<Payment[]> {
    return this.paymentsService.findByStudentDni(studentDni);
  }

  @Post()
  async create(@Body() createPaymentDto: CreatePaymentDto): Promise<Payment> {
    return this.paymentsService.create(createPaymentDto);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateData: Partial<CreatePaymentDto>,
  ): Promise<Payment> {
    return this.paymentsService.update(id, updateData);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.paymentsService.remove(id);
  }
}
