import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';
import {JwtStrategy} from './jwt.strategy'
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      signOptions: {
        expiresIn: '15m', // Access token expires in 15 minutes
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService, EmailService,JwtStrategy],
  exports: [JwtModule],
})
export class AuthModule {}
