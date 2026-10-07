import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';

import { AuthService } from './auth.service';

import { RegisterDto } from './dto/register.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { LoginDto } from './dto/login.dto';
import type { Response } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { Request } from 'express';



@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() registerDto: RegisterDto,
  ) {
    return this.authService.register(
      registerDto,
    );
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(
    @Body() verifyOtpDto: VerifyOtpDto,
  ) {
    return this.authService.verifyOtp(
      verifyOtpDto,
    );
  }

  @Post("set-password")
  @HttpCode(HttpStatus.OK)
  async setPassword(
    @Body() setPasswordDto: SetPasswordDto,
  ) {
    return this.authService.setPassword(setPasswordDto)
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({passthrough: true}) response: Response
  ) {
    return this.authService.login(
      loginDto,
      response
    )
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  getCurrentUser(
    @Req() request: Request
  ) {
    return {
      user: request.user
    }
  }


  @Post('refresh')
@HttpCode(HttpStatus.OK)
async refresh(
  @Req() request: Request,
) {
  const refreshToken =
    request.cookies?.refreshToken;

  return this.authService.refresh(
    refreshToken,
  );
}

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
  @Req()
  request: Request & {
    user: {
      id: string;
    };
  },
  @Res({ passthrough: true })
  response: Response,
) {
  return this.authService.logout(
    request.user.id,
    response,
  );
}
}