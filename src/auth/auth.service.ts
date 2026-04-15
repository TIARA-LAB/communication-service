import { Injectable, BadRequestException, Logger, InternalServerErrorException } from '@nestjs/common';
import { UnauthorizedException} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { randomInt } from 'crypto';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { EmailService } from './email.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async requestOtp(email: string, phone: string) {
    // 1. Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('Invalid email format');
    }

    // 2. Validate & Format phone number
    const phoneNumber = parsePhoneNumberFromString(phone);
    if (!phoneNumber || !phoneNumber.isValid()) {
      throw new BadRequestException('Invalid phone number format');
    }

    // 3. Throttling (Rate Limit) - use email for throttling
    const isThrottled = await this.redis.get(`limit:${email}`);
    if (isThrottled) {
      throw new BadRequestException('Please wait 60s before requesting again');
    }

    // 4. Generate 6-digit OTP
    const otp = randomInt(100000, 999999).toString();

    try {
      // 5. Store in Redis with email as key
      await this.redis.set(`otp:${email}`, otp, 'EX', 300);
      await this.redis.set(`limit:${email}`, 'true', 'EX', 60);

      // 6. Send Email via Resend
      await this.emailService.sendOtp(email, otp);

      this.logger.log(`OTP sent successfully to ${email}`);
      return {
        success: true,
        message: 'Verification code sent to your email',
        data: { retry_after: '60s' },
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Internal service error';
      this.logger.error(`Auth Request Error: ${errorMessage}`);

      throw new InternalServerErrorException(
        'Failed to process authentication request',
      );
    }
  }

  async verifyOtp(email: string, phone: string, otp: string) {
    // 1. Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('Invalid email format');
    }

    // 2. Validate & Format phone number
    const phoneNumber = parsePhoneNumberFromString(phone);
    if (!phoneNumber || !phoneNumber.isValid()) {
      throw new BadRequestException('Invalid phone number format');
    }

    const formattedPhone = phoneNumber.number as string;

    // 3. Check if OTP exists and matches
    const storedOtp = await this.redis.get(`otp:${email}`);
    if (!storedOtp) {
      throw new BadRequestException(
        'OTP expired or not found. Please request a new one',
      );
    }

    if (storedOtp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    try {
      // 4. Find or create user
      let user = await (this.prisma as any).user.findUnique({
        where: { email: email },
      });

      if (!user) {
        user = await (this.prisma as any).user.create({
          data: {
            email: email,
            phone: formattedPhone,
          },
        });
        this.logger.log(`New user created: ${email}`);
      } else {
        // Update phone if different
        if (user.phone !== formattedPhone) {
          user = await (this.prisma as any).user.update({
            where: { email: email },
            data: { phone: formattedPhone },
          });
        }
      }

      // 5. Generate access and refresh tokens
      const accessToken = this.jwtService.sign(
        { sub: user.id, email: user.email, phone: user.phone },
        { expiresIn: '15m' },
      );

      const refreshToken = this.jwtService.sign(
        { sub: user.id, email: user.email, phone: user.phone, type: 'refresh' },
        { expiresIn: '30d' },
      );

      // 6. Store refresh token in Redis
      await this.redis.set(
        `refresh:${user.id}`,
        refreshToken,
        'EX',
        30 * 24 * 60 * 60,
      ); // 30 days

      // 7. Delete OTP from Redis after successful verification
      await this.redis.del(`otp:${email}`);

      this.logger.log(`User verified successfully: ${email}`);
      return {
        success: true,
        message: 'Authentication successful',
        data: {
          accessToken,
          refreshToken,
          user: {
            id: user.id,
            email: user.email,
            phone: user.phone,
            name: user.name,
            avatar: user.avatar,
          },
        },
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Verification failed';
      this.logger.error(`Verification Error: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to verify OTP');
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      // 1. Verify the refresh token
      const decoded = this.jwtService.verify(refreshToken);

      if (decoded.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // 2. Check if refresh token exists in Redis
      const storedRefreshToken = await this.redis.get(`refresh:${decoded.sub}`);
      if (!storedRefreshToken || storedRefreshToken !== refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // 3. Get user
      const user = await (this.prisma as any).user.findUnique({
        where: { id: decoded.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // 4. Generate new access token
      const newAccessToken = this.jwtService.sign(
        { sub: user.id, email: user.email, phone: user.phone },
        { expiresIn: '15m' },
      );

      this.logger.log(`Token refreshed for user: ${user.email}`);
      return {
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: newAccessToken,
        },
      };
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Token refresh failed';
      this.logger.error(`Token Refresh Error: ${errorMessage}`);
      throw new UnauthorizedException('Invalid refresh token');
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

      // 4. If it's a refresh token, remove it from Redis
      if (decoded.type === 'refresh') {
        await this.redis.del(`refresh:${decoded.sub}`);
      }

      this.logger.log(
        `User logged out successfully: ${decoded.email || decoded.phone}`,
      );
      return {
        success: true,
        message: 'Logged out successfully',
        data: {},
      };
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Logout failed';
      this.logger.error(`Logout Error: ${errorMessage}`);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
