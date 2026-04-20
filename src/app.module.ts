import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule } from '@nestjs-modules/ioredis';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaService } from './prisma/prisma.service';
import { AuthModule } from './auth/auth.module';
import { MessageController } from './message/message.controller';
import { MessageService } from './message/message.service';
import { MessageGateway } from './message/message.gateway';
import { ProfileController } from './profile/profile.controller';
import { ProfileService } from './profile/profile.service';
import { ProfileModule } from './profile/profile.module';

@Module({
  imports: [
    // 1. Load Environment Variables globally
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // 2. Async Redis Config to satisfy the 'type: single' requirement
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'single', // Explicitly required by the library interface
        options: {
          host: configService.get('REDIS_HOST') || 'localhost',
          port: 6379,
        },
      }),
      inject: [ConfigService],
    }),

    PrismaModule,
    AuthModule,
    ProfileModule
  ],
  controllers: [AppController, MessageController],
  providers: [
    AppService, 
    MessageService, 
    MessageGateway, 
    PrismaService
  ],
})
export class AppModule {}