import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';

@ApiTags('Groups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a new group' })
  @ApiResponse({ status: 201, description: 'Group successfully created' })
  @ApiResponse({ status: 400, description: 'Invalid group data' })
  async create(@Req() req, @Body() dto: CreateGroupDto) {
    return this.groupsService.createGroup(req.user.userId, dto);
  }

  @Get('my-groups')
  @ApiOperation({ summary: 'Get groups for the current user' })
  @ApiResponse({ status: 200, description: 'List of groups returned' })
  async getMyGroups(@Req() req) {
    return this.groupsService.getMyGroups(req.user.userId);
  }

  @Post(':id/add/:userId')
  @ApiOperation({ summary: 'Add a member to a group' })
  @ApiResponse({ status: 200, description: 'User successfully added to group' })
  @ApiResponse({ status: 400, description: 'Invalid group or user IDs' })
  async addMember(
    @Param('id', ParseIntPipe) groupId: number,
    @Param('userId', ParseIntPipe) targetUserId: number,
    @Req() req,
  ) {
    return this.groupsService.addMember(groupId, req.user.userId, targetUserId);
  }
}
