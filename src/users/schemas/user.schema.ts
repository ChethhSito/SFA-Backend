import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop()
  id?: string;

  @Prop()
  dni?: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  displayName: string;

  @Prop()
  lastName?: string;

  @Prop()
  phone?: string;

  @Prop({ default: 'user' })
  role: string;

  @Prop({ default: 'General' })
  assignedModule: string;

  @Prop({ default: 'Activo' })
  status: string;

  @Prop({ default: '123' })
  password?: string;

  @Prop()
  firebaseUid?: string;

  @Prop()
  photoURL?: string;

  @Prop()
  lastLogin?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
