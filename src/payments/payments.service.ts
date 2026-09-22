import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payment, PaymentDocument } from './schemas/payment.schema';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Payment.name)
    private paymentModel: Model<PaymentDocument>,
  ) {}

  async findAll(): Promise<Payment[]> {
    return this.paymentModel.find().sort({ createdAt: -1 }).exec();
  }

  async findByStudentDni(studentDni: string): Promise<Payment[]> {
    return this.paymentModel.find({ studentDni }).sort({ createdAt: -1 }).exec();
  }

  async create(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    const paymentId = createPaymentDto.paymentId || `tx-${Date.now()}`;
    const newPayment = new this.paymentModel({
      ...createPaymentDto,
      paymentId,
      date: createPaymentDto.date || new Date().toISOString().split('T')[0],
      status: createPaymentDto.status || 'APROBADO',
    });
    return newPayment.save();
  }

  async update(id: string, updateData: Partial<CreatePaymentDto>): Promise<Payment> {
    const updated = await this.paymentModel
      .findOneAndUpdate({ paymentId: id }, updateData, { new: true })
      .exec();
    if (!updated) {
      const updatedById = await this.paymentModel
        .findByIdAndUpdate(id, updateData, { new: true })
        .exec();
      if (!updatedById) {
        throw new NotFoundException(`Pago con id "${id}" no encontrado.`);
      }
      return updatedById;
    }
    return updated;
  }

  async remove(id: string): Promise<{ success: boolean }> {
    const result = await this.paymentModel.deleteOne({ paymentId: id }).exec();
    if (result.deletedCount === 0) {
      await this.paymentModel.findByIdAndDelete(id).exec();
    }
    return { success: true };
  }
}
