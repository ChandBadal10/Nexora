import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';

import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';

import {
  UserRole,
  UserStatus,
} from '../users/schemas/user.schema';

import { UsersService } from '../users/users.service';

import { RegisterDto } from './dto/register.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  // REGISTER
  async register(registerDto: RegisterDto) {
    const name = registerDto.name.trim();

    const email = registerDto.email
      .trim()
      .toLowerCase();

    // Check if email already exists
    const existingUser =
      await this.usersService.findByEmail(email);

    if (existingUser) {
      throw new ConflictException(
        'Email is already registered',
      );
    }

    // Generate 6 digit OTP
    const otp = randomInt(100000, 1000000).toString();

    // Hash OTP
    const hashedOtp = await bcrypt.hash(
      otp,
      10,
    );

    // OTP valid for 10 minutes
    const otpExpiresAt = new Date(
      Date.now() + 10 * 60 * 1000,
    );

    // Create user
    const user = await this.usersService.create({
      name,
      email,
      password: undefined,

      role: UserRole.EMPLOYEE,

      status: UserStatus.PENDING,

      isEmailVerified: false,

      otp: hashedOtp,

      otpExpiresAt,

      otpAttempts: 0,
    });

    // Temporary OTP for testing
    console.log(
      `OTP for ${email}: ${otp}`,
    );

    return {
      message:
        'OTP sent successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    };
  }

  // VERIFY OTP
  async verifyOtp(
    verifyOtpDto: VerifyOtpDto,
  ) {
    const email = verifyOtpDto.email
      .trim()
      .toLowerCase();

    const otp = verifyOtpDto.otp.trim();

    // Find user
    const user =
      await this.usersService.findByEmail(email);

    if (!user) {
      throw new BadRequestException(
        'Invalid email or OTP',
      );
    }

    // Check if already verified
    if (user.isEmailVerified) {
      throw new BadRequestException(
        'Email is already verified',
      );
    }

    // Check OTP exists
    if (!user.otp || !user.otpExpiresAt) {
      throw new BadRequestException(
        'OTP not found. Please request a new OTP.',
      );
    }

    // Check expiry
    if (
      new Date() > user.otpExpiresAt
    ) {
      throw new BadRequestException(
        'OTP has expired',
      );
    }

    // Check attempts
    if (user.otpAttempts >= 5) {
      throw new BadRequestException(
        'Too many incorrect attempts',
      );
    }

    // Compare OTP
    const isOtpCorrect =
      await bcrypt.compare(
        otp,
        user.otp,
      );

    if (!isOtpCorrect) {
      user.otpAttempts += 1;

      await user.save();

      throw new BadRequestException(
        'Invalid OTP',
      );
    }

    // OTP is correct
    user.isEmailVerified = true;

    user.status = UserStatus.ACTIVE;

    user.otp = undefined;

    user.otpExpiresAt = undefined;

    user.otpAttempts = 0;

    await user.save();

    return {
      message:
        'Email verified successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    };
  }
}