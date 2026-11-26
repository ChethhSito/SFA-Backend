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

  private stripHeavyNotes(doc: any): any {
    if (!doc) return doc;
    const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
    if (typeof obj.notes === 'string' && obj.notes.length > 500) {
      try {
        const parsed = JSON.parse(obj.notes);
        if (parsed && typeof parsed === 'object') {
          let changed = false;
          for (const key of ['voucherDataUrl', 'fileDataUrl', 'constanciaDataUrl']) {
            if (typeof parsed[key] === 'string' && parsed[key].startsWith('data:')) {
              parsed[key] = '';
              parsed.hasVoucherData = true;
              changed = true;
            }
          }
          if (changed) {
            obj.notes = JSON.stringify(parsed);
          }
        }
      } catch {}
    }
    return obj;
  }

  async findAll(): Promise<Payment[]> {
    const list = await this.paymentModel.find().sort({ createdAt: -1 }).lean().exec();
    return list.map((item) => this.stripHeavyNotes(item)) as Payment[];
  }

  async findOne(id: string): Promise<Payment> {
    const found = await this.paymentModel.findOne({ paymentId: id }).lean().exec();
    if (found) return found as Payment;
    const byId = await this.paymentModel.findById(id).lean().exec().catch(() => null);
    if (!byId) {
      throw new NotFoundException(`Pago con id "${id}" no encontrado.`);
    }
    return byId as Payment;
  }

  async findByStudentDni(studentDni: string): Promise<Payment[]> {
    const list = await this.paymentModel.find({ studentDni }).sort({ createdAt: -1 }).lean().exec();
    return list.map((item) => this.stripHeavyNotes(item)) as Payment[];
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
    const { _id, ...cleanData } = updateData as any;
    const updated = await this.paymentModel
      .findOneAndUpdate({ paymentId: id }, { $set: cleanData }, { returnDocument: 'after' })
      .exec();
    if (!updated) {
      const updatedById = await this.paymentModel
        .findByIdAndUpdate(id, { $set: cleanData }, { returnDocument: 'after' })
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
