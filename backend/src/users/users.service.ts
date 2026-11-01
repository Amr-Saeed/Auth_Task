import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema.js';

export interface CreateUserInput {
  name: string;
  email: string;
  passwordHash: string;
}

const MONGO_DUPLICATE_KEY = 11000;

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async create(input: CreateUserInput): Promise<UserDocument> {
    try {
      return await this.userModel.create(input);
    } catch (error) {
      if ((error as { code?: number }).code === MONGO_DUPLICATE_KEY) {
        throw new ConflictException(
          'An account with this email already exists',
        );
      }
      throw error;
    }
  }

  findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).select('+passwordHash').exec();
  }
}
