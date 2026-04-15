import {
  Controller,
  Post,
  Body,
  ValidationPipe,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { LogoutDto } from './dto/logout.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('request-otp')
  @ApiOperation({ summary: 'Request OTP for phone number' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid phone number' })
  async requestOtp(@Body(new ValidationPipe()) body: RequestOtpDto) {
    return this.authService.requestOtp(body.phone);
  }

  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify OTP and get access token' })
  @ApiResponse({
    status: 200,
    description: 'Verified successfully, token issued',
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  async verifyOtp(@Body(new ValidationPipe()) body: VerifyOtpDto) {
    return this.authService.verifyOtp(body.phone, body.otp);
  }

  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user (blacklist token)' })
  @ApiResponse({ status: 200, description: 'Successfully logged out' })
  @ApiResponse({ status: 401, description: 'Invalid token' })
  async logout(@Body(new ValidationPipe()) body: LogoutDto) {
    return this.authService.logout(body.token);
  }
}
