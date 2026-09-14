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

  async create(createDto: any): Promise<UserDocument> {
    const created = new this.userModel(createDto);
    return created.save();
  }

  async findAll(): Promise<UserDocument[]> {
    return this.userModel.find().exec();
  }

  async findByUid(uid: string): Promise<UserDocument> {
    const user = await this.userModel.findOne({ 
      $or: [
        { firebaseUid: uid },
        { dni: uid },
        { email: uid.toLowerCase() }
      ] 
    }).exec();
    if (!user) {
      throw new NotFoundException(`User ${uid} not found`);
    }
    return user;
  }

  async update(id: string, updateDto: any): Promise<UserDocument> {
    const updated = await this.userModel
      .findOneAndUpdate(
        { $or: [{ _id: id }, { id: id }, { dni: id }] },
        updateDto,
        { new: true, upsert: true }
      )
      .exec();
    return updated;
  }

  async remove(id: string): Promise<any> {
    return this.userModel.deleteOne({ $or: [{ _id: id }, { id: id }, { dni: id }] }).exec();
  }
}
