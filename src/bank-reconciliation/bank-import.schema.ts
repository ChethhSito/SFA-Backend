import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import type { BankRow } from './bank-reconciliation.service';

export type BankImportDocument = BankImport & Document;

@Schema({ timestamps: true })
export class BankImport {
  @Prop({ required: true, unique: true })
  fingerprint: string;

  @Prop({ required: true })
  fileName: string;

  @Prop({ type: [MongooseSchema.Types.Mixed], required: true })
  rows: BankRow[];

  @Prop({ type: [MongooseSchema.Types.Mixed], required: true })
  results: Record<string, unknown>[];

  @Prop({ type: [String], default: [] })
  validatedObligationIds: string[];

  @Prop({ required: true })
  importedAt: string;
}

export const BankImportSchema = SchemaFactory.createForClass(BankImport);
