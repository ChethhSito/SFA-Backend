import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GraduationDocument = Graduation & Document;

@Schema({ _id: false })
export class DocsChecked {
  @Prop({ required: true, default: false })
  solicitud: boolean;

  @Prop({ required: true, default: false })
  constanciaEgresado: boolean;

  @Prop({ required: true, default: false })
  practicasPre: boolean;

  @Prop({ required: true, default: false })
  pagoDerecho: boolean;
}

@Schema({ timestamps: true })
export class Graduation {
  @Prop({ required: true, unique: true })
  studentDni: string;

  @Prop({ required: true, default: 'Solicitado' })
  status: string;

  @Prop({ required: true, default: 'Solicitud' })
  step: string;

  @Prop({ type: DocsChecked, default: () => ({}) })
  docsChecked: DocsChecked;

  @Prop()
  obs?: string;
}

export const GraduationSchema = SchemaFactory.createForClass(Graduation);
