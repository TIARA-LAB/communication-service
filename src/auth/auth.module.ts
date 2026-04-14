import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from './sms.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService , PrismaService,SmsService]
})
export class AuthModule {}
