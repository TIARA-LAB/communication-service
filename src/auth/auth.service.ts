import { Injectable, BadRequestException, Logger, InternalServerErrorException } from '@nestjs/common';
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
}