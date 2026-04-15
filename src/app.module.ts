import { Module } from '@nestjs/common';
import { MessageController } from './message/message.controller';
import { MessageService } from './message/message.service';
import { MessageGateway } from './message/message.gateway';
import { PrismaService } from './prisma/prisma.service';
import { RedisModule } from '@songkeys/nestjs-redis';

@Module({
  imports: [
    RedisModule.forRoot({
      config: {
        host: process.env.REDIS_HOST || 'db',
        port: 6379,
      },
    }),
  ],
  controllers: [
    MessageController, // Add this
  ],
  providers: [
    MessageService,    // Add this
    MessageGateway,    // Add this
    PrismaService,     // Ensure your PrismaService is here too
  ],
})
export class AppModule {}