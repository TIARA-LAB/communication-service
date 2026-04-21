import { Module } from '@nestjs/common';
import { MessageService } from './message.service';
import { AuthModule } from 'src/auth/auth.module';
import { MessageController } from './message.controller';
import { MessageGateway } from './message.gateway';

import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  imports:[AuthModule],
  controllers:[MessageController],
  providers: [MessageService,PrismaService,MessageGateway]
})
export class MessageModule {}
