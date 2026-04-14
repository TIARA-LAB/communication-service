import { Controller, Post, Body, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RequestOtpDto } from './dto/request-otp.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('request-otp')
  @ApiOperation({ summary: 'Send 6-digit code to phone' })
  @ApiResponse({ status: 200, description: 'Success' })
  async requestOtp(@Body(new ValidationPipe()) body: RequestOtpDto) {
    return this.authService.requestOtp(body.phone);
  }
}