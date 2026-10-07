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
  // User's full name
  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  name!: string;

  // User's email
  @Prop({
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  })
  email!: string;

  // Password
  // It will be empty during registration
  // and added after OTP verification
  @Prop({
    type: String,

    select: false,
  })
  password?: string;

  // User role
  @Prop({
    type: String,
    enum: UserRole,
    default: UserRole.EMPLOYEE,
  })
  role!: UserRole;

  // User account status
  @Prop({
    type: String,
    enum: UserStatus,
    default: UserStatus.PENDING,
  })
  status!: UserStatus;

  // Whether email has been verified
  @Prop({
    type: Boolean,
    default: false,
  })
  isEmailVerified!: boolean;

  // Hashed OTP
  @Prop({
    type: String,
    default: null,
    select: false,
  })
  otp?: string;

  // OTP expiry time
  @Prop({
    type: Date,
    default: null,
  })
  otpExpiresAt?: Date;

  // Number of incorrect OTP attempts
  @Prop({
    type: Number,
    default: 0,
  })
  otpAttempts!: number;

  // Hashed refresh token
  @Prop({
    type: String,
    default: null,
    select: false,
  })
  refreshToken?: string;

  // Last successful login time
  @Prop({
    type: Date,
    default: null,
  })
  lastLoginAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);