import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
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
import { SetPasswordDto } from './dto/set-password.dto';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { Response } from 'express';
import { EmailService } from 'src/email/email.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
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

    await this.emailService.sendOtpEmail(email,name,otp)

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


  //Set Password
  async setPassword(setPasswordDto: SetPasswordDto) {
    const email = setPasswordDto.email.trim().toLowerCase();

    const password = setPasswordDto.password;

    //find user
    const user = await this.usersService.findByEmail(email);
    if(!user) {
      throw new BadRequestException("User not found");
    }

    //Email must be verified first
    if(!user.isEmailVerified) {
      throw new BadRequestException("Please verify your email");
    }

    //check if password is already set
    if(user.password) {
      throw new BadRequestException("Password is already set")
    }

    //hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    //Save Password
    user.password = hashedPassword;

    await user.save();

    return {
      message: "Password set successfully"
    }
  }


  //Login
  async login(loginDto: LoginDto, response: Response) {
    const email = loginDto.email.trim().toLowerCase();

    const password = loginDto.password;

    //Find user
    const user = await this.usersService.findByEmail(email);

    if(!user) {
      throw new UnauthorizedException("Invalid email or password");
    }

    //check email verification
    if(!user.isEmailVerified) {
      throw new UnauthorizedException("Please verify your email first");
    }

    //Check password
    if(!user.password) {
      throw new UnauthorizedException("Please set your password first");
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if(!isPasswordCorrect) {
      throw new UnauthorizedException("Invalid email or password")
    }

    //create access token
    const accessToken = await this.jwtService.signAsync(
      {
        sub: user._id.toString(),
        email: user.email,
        role: user.role,
      },
      {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: "15m",
      }
    );

    //create refresh token
    const refreshToken = await this.jwtService.signAsync(
      {
        sub: user._id.toString(),
      },
      {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: "7d",
      }
    );

    response.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    //save refresh token
    user.refreshToken = await bcrypt.hash(refreshToken, 10);
    user.lastLoginAt = new Date();

    await user.save();

    return {
      message: "Login successful",
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    }
  }



  //refresh token
  async refresh(
  refreshToken: string,
) {
  if (!refreshToken) {
    throw new UnauthorizedException(
      'Refresh token not found',
    );
  }

  let payload: {
    sub: string;
  };

  try {
    payload =
      await this.jwtService.verifyAsync(
        refreshToken,
        {
          secret:
            process.env.JWT_REFRESH_SECRET,
        },
      );
  } catch {
    throw new UnauthorizedException(
      'Invalid or expired refresh token',
    );
  }

  const user =
    await this.usersService.findById(
      payload.sub,
    );

  if (!user || !user.refreshToken) {
    throw new UnauthorizedException(
      'Invalid refresh token',
    );
  }

  const isValid =
    await bcrypt.compare(
      refreshToken,
      user.refreshToken,
    );

  if (!isValid) {
    throw new UnauthorizedException(
      'Invalid refresh token',
    );
  }

  const accessToken =
    await this.jwtService.signAsync(
      {
        sub: user._id.toString(),
        email: user.email,
        role: user.role,
      },
      {
        secret:
          process.env.JWT_ACCESS_SECRET,
        expiresIn: '15m',
      },
    );

  return {
    message:
      'Access token refreshed successfully',
    accessToken,
  };
}

  async logout(
  userId: string,
  response: Response,
) {
  const user =
    await this.usersService.findById(userId);

  if (user) {
    user.refreshToken = undefined;
    await user.save();
  }

  response.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite:
      process.env.NODE_ENV === 'production'
        ? 'none'
        : 'lax',
  });

  return {
    message: 'Logout successful',
  };
}

}