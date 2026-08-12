import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async findOrCreate(firebaseUser: {
    uid: string;
    email: string;
    displayName?: string;
    photoURL?: string;
  }): Promise<UserDocument> {
    const { uid, email, displayName, photoURL } = firebaseUser;

    let user = await this.userModel.findOne({ firebaseUid: uid }).exec();
    if (!user) {
      user = new this.userModel({
        firebaseUid: uid,
        email,
        displayName: displayName || '',
        photoURL: photoURL || '',
      });
      await user.save();
    }
    return user;
  }

  async findByUid(uid: string): Promise<UserDocument> {
    const user = await this.userModel.findOne({ firebaseUid: uid }).exec();
    if (!user) {
      throw new NotFoundException(`User with Firebase UID ${uid} not found`);
    }
    return user;
  }

  async findAll(): Promise<UserDocument[]> {
    return this.userModel.find().exec();
  }
}
