import { Injectable, BadRequestException, Logger, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { randomInt } from 'crypto';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { SmsService } from './sms.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly smsService: SmsService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async requestOtp(phone: string) {
    // 1. Validate & Format
    const phoneNumber = parsePhoneNumberFromString(phone);
    if (!phoneNumber || !phoneNumber.isValid()) {
      throw new BadRequestException('Invalid phone number format');
    }
    
    // Non-null assertion for TypeScript safety
    const formattedPhone = phoneNumber.number as string;

    // 2. Throttling (Rate Limit)
    const isThrottled = await this.redis.get(`limit:${formattedPhone}`);
    if (isThrottled) {
      throw new BadRequestException('Please wait 60s before requesting again');
    }

    // 3. Generate 6-digit OTP
    const otp = randomInt(100000, 999999).toString();

    try {
      // 4. Store in Redis
      await this.redis.set(`otp:${formattedPhone}`, otp, 'EX', 300);
      await this.redis.set(`limit:${formattedPhone}`, 'true', 'EX', 60);

      // 5. Send SMS via Twilio
      await this.smsService.sendOtp(formattedPhone, otp);

      this.logger.log(`OTP sent successfully to ${formattedPhone}`);
      return { 
        success: true, 
        message: 'Verification code sent',
        data: { retry_after: '60s' }
      };

    } catch (error: unknown) {
      // Fix: Handle 'unknown' type for production strict mode
      const errorMessage = error instanceof Error ? error.message : 'Internal service error';
      this.logger.error(`Auth Request Error: ${errorMessage}`);
      
      throw new InternalServerErrorException('Failed to process authentication request');
    }
  }

  async verifyOtp(phone: string, otp: string) {
    // 1. Validate & Format phone number
    const phoneNumber = parsePhoneNumberFromString(phone);
    if (!phoneNumber || !phoneNumber.isValid()) {
      throw new BadRequestException('Invalid phone number format');
    }

    const formattedPhone = phoneNumber.number as string;

    // 2. Check if OTP exists and matches
    const storedOtp = await this.redis.get(`otp:${formattedPhone}`);
    if (!storedOtp) {
      throw new BadRequestException('OTP expired or not found. Please request a new one');
    }

    if (storedOtp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    try {
      // 3. Find or create user
      let user = await (this.prisma as any).user.findUnique({
        where: { phone: formattedPhone },
      });

      if (!user) {
        user = await (this.prisma as any).user.create({
          data: {
            phone: formattedPhone,
          },
        });
        this.logger.log(`New user created: ${formattedPhone}`);
      }

      // 4. Generate JWT token
      const token = this.jwtService.sign(
        { sub: user.id, phone: user.phone },
        { expiresIn: '7d' }
      );

      // 5. Delete OTP from Redis after successful verification
      await this.redis.del(`otp:${formattedPhone}`);

      this.logger.log(`User verified successfully: ${formattedPhone}`);
      return {
        success: true,
        message: 'Authentication successful',
        data: {
          token,
          user: {
            id: user.id,
            phone: user.phone,
            name: user.name,
            avatar: user.avatar,
          },
        },
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Verification failed';
      this.logger.error(`Verification Error: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to verify OTP');
    }
  }

  async logout(token: string) {
    try {
      // 1. Verify and decode the token to get expiration time
      const decoded = this.jwtService.verify(token);

      // 2. Calculate remaining time to expiration
      const now = Math.floor(Date.now() / 1000);
      const expiresIn = decoded.exp - now;

      if (expiresIn <= 0) {
        throw new UnauthorizedException('Token already expired');
      }

      // 3. Blacklist the token in Redis until expiration
      await this.redis.set(`blacklist:${token}`, 'true', 'EX', expiresIn);

      this.logger.log(`User logged out successfully: ${decoded.phone}`);
      return {
        success: true,
        message: 'Logged out successfully',
        data: {},
      };
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Logout failed';
      this.logger.error(`Logout Error: ${errorMessage}`);
      throw new UnauthorizedException('Invalid token');
    }
  }
}