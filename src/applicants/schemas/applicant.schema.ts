import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ApplicantDocument = Applicant & Document;

@Schema({ _id: false })
export class StudentDoc {
  @Prop({ required: true, default: 'No Enviado' })
  status: string;

  @Prop()
  fileName?: string;

  @Prop()
  observations?: string;

  @Prop()
  fileDataUrl?: string;
}

@Schema({ _id: false })
export class SupportMessage {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  sender: string;

  @Prop()
  category?: string;

  @Prop({ required: true })
  text: string;

  @Prop({ required: true })
  date: string;
}

@Schema({ timestamps: true })
export class Applicant {
  @Prop({ required: true, unique: true })
  applicantCode: string;

  @Prop({ required: true, unique: true })
  dni: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true })
  programId: string;

  @Prop({ required: true, default: 'No Pagado' })
  paymentStatus: string;

  @Prop()
  paymentOperation?: string;

  @Prop()
  paymentObservations?: string;

  @Prop({ required: true, default: 'No Programado' })
  examStatus: string;

  @Prop()
  examScore?: number;

  @Prop({ required: true, default: false })
  admitted: boolean;

  @Prop({ type: Object })
  docs?: {
    dniFile: StudentDoc;
    certificadoFile: StudentDoc;
    partidaFile?: StudentDoc;
    fotoFile: StudentDoc;
  };

  @Prop({ required: true })
  periodId: string;

  @Prop({ required: true, default: 'Pending' })
  folderStatus: string;

  @Prop()
  folderObservations?: string;

  @Prop()
  password?: string;

  @Prop({ type: [Object], default: [] })
  supportMessages?: SupportMessage[];
}

export const ApplicantSchema = SchemaFactory.createForClass(Applicant);
