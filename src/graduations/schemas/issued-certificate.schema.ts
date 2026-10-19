import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
export type IssuedCertificateDocument = HydratedDocument<IssuedCertificate>;

@Schema({ timestamps: true })
export class IssuedCertificate {
  @Prop({ required: true }) studentDni: string;
  @Prop({ required: true }) studentName: string;
  @Prop({ required: true, unique: true }) number: string;
  @Prop({ required: true }) issuedDate: string;
  @Prop({ required: true }) issuerName: string;
  @Prop({ required: true }) fileName: string;
  @Prop({ required: true, select: false }) fileData: string;
  @Prop({ required: true }) sha256: string;
  @Prop({ required: true, unique: true }) verificationCode: string;
  @Prop({ default: true }) active: boolean;
  @Prop({ required: true }) registeredAt: Date;
  @Prop({ required: true }) registeredBy: string;
  @Prop({ type: Date, default: null }) revokedAt: Date | null;
  @Prop({ default: '' }) revocationReason: string;
  @Prop({ default: '' }) revokedBy: string;
}
export const IssuedCertificateSchema = SchemaFactory.createForClass(IssuedCertificate);
IssuedCertificateSchema.index({ studentDni: 1 }, { unique: true, partialFilterExpression: { active: true } });
