import { Module } from '@nestjs/common';
import { MessageService } from './message.service';
import { AuthModule } from 'src/auth/auth.module';
import { MessageController } from './message.controller';

@Module({
  imports:[AuthModule],
  controllers:[MessageController],
  providers: [MessageService]
})
export class MessageModule {}
