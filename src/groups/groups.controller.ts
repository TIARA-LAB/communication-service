import { Controller, Post, Get, Body, UseGuards, Req, Param, ParseIntPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';

@UseGuards(JwtAuthGuard)
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post('create')
  async create(@Req() req, @Body() dto: CreateGroupDto) {
    return this.groupsService.createGroup(req.user.userId, dto);
  }

  @Get('my-groups')
  async getMyGroups(@Req() req) {
    return this.groupsService.getMyGroups(req.user.userId);
  }

  @Post(':id/add/:userId')
  async addMember(
    @Param('id', ParseIntPipe) groupId: number,
    @Param('userId', ParseIntPipe) targetUserId: number,
    @Req() req,
  ) {
    return this.groupsService.addMember(groupId, req.user.userId, targetUserId);
  }
}