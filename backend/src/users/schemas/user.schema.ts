import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  COMPANY_ADMIN = 'COMPANY_ADMIN',
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  EMPLOYEE = 'EMPLOYEE',
  CLIENT = 'CLIENT',
}

export enum UserStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

@Schema({
  timestamps: true,
})
export class User {
  @Prop({
    required: true,
    trim: true,
  })
  name!: string;

  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  email!: string;

  @Prop({
    required: true,
    select: false,
  })
  password!: string;

  @Prop({
    type: String,
    enum: UserRole,
    default: UserRole.EMPLOYEE,
  })
  role!: UserRole;

  @Prop({
    type: String,
    enum: UserStatus,
    default: UserStatus.PENDING,
  })
  status!: UserStatus;

  @Prop({
    default: false,
  })
  isEmailVerified!: boolean;

  @Prop({
    type: String,
    default: null,
  })
  emailVerificationToken!: string | null;

  @Prop({
    type: Date,
    default: null,
  })
  emailVerificationExpires!: Date | null;

  @Prop({
    type: String,
    default: null,
  })
  passwordResetToken!: string | null;

  @Prop({
    type: Date,
    default: null,
  })
  passwordResetExpires!: Date | null;

  @Prop({
    type: String,
    default: null,
    select: false,
  })
  refreshTokenHash!: string | null;

  @Prop({
    type: Date,
    default: null,
  })
  lastLoginAt!: Date | null;
}

export const UserSchema = SchemaFactory.createForClass(User);