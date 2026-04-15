import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@nestjs-modules/ioredis';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module'; // Only one line!

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RedisModule.forRoot({
      type: 'single',
      url: `redis://${process.env.REDIS_HOST || 'localhost'}:6379`,
    }),
    AuthModule,
  ],
})
export class AppModule {}