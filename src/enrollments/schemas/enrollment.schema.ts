import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EnrollmentDocument = Enrollment & Document;

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
export class EnrollmentDocs {
  @Prop({ type: StudentDoc, default: () => ({}) })
  dniFile: StudentDoc;

  @Prop({ type: StudentDoc, default: () => ({}) })
  certificadoFile: StudentDoc;

  @Prop({ type: StudentDoc, default: () => ({}) })
  partidaFile: StudentDoc;

  @Prop({ type: StudentDoc, default: () => ({}) })
  fotoFile: StudentDoc;
}

@Schema({ timestamps: true })
export class Enrollment {
  @Prop({ required: true, unique: true })
  studentDni: string;

  @Prop({ required: true })
  programId: string;

  @Prop({ required: true, default: 'ADMITIDO' })
  academicStatus: string;

  @Prop({ type: EnrollmentDocs, default: () => ({}) })
  docs: EnrollmentDocs;

  @Prop({ required: true, default: 'No Pagado' })
  paymentStatus: string;

  @Prop()
  paymentOperation?: string;

  @Prop()
  shift?: string;
}

export const EnrollmentSchema = SchemaFactory.createForClass(Enrollment);
