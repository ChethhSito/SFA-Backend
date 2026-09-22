import { IsString, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  @IsOptional()
  paymentId?: string;

  @IsString()
  @IsNotEmpty()
  studentDni: string;

  @IsString()
  @IsNotEmpty()
  concept: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @IsString()
  @IsOptional()
  receiptNumber?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
