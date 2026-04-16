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
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    RedisModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        type: 'single',
        url: `redis://${configService.get('REDIS_HOST') || 'localhost'}:6379`,
      }),
      inject: [ConfigService],
    }),

    PrismaModule,
    AuthModule,
  ],
  controllers: [AppController, MessageController],
  providers: [AppService, MessageService, MessageGateway, PrismaService,JwtModule],
})
export class AppModule {}
