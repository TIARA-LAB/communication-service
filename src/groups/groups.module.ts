import { Module } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { AuthModule } from 'src/auth/auth.module';
import { GroupsController } from './groups.controller';

@Module({
  imports:[AuthModule],
  controllers:[GroupsController],
  providers: [GroupsService]
})
export class GroupsModule {}
