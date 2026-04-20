import { Controller, Get, Patch, Post, Body, UseGuards, Req, UseInterceptors, UploadedFile, UnauthorizedException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProfileService } from './profile.service';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { PrismaService } from 'src/prisma/prisma.service';
@ApiTags('User Profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService, private readonly prisma: PrismaService) {}

  @Get('me')
@ApiOperation({ summary: 'Get my own profile' })
async getMe(@Req() req) {
  // Ensure req.user exists and has the userId property
  if (!req.user || !req.user.userId) {
    throw new UnauthorizedException('User ID not found in request');
  }
  return this.profileService.getProfile(req.user.userId);
}

  @Patch('update')
  @ApiOperation({ summary: 'Update your Name or About status' })
  async update(@Req() req, @Body() body: { name?: string; bio?: string }) {
    return this.profileService.updateInfo(req.user.userId, body);
  }

  @Post('avatar')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update Profile Picture' })
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/profiles',
      filename: (req, file, cb) => {
        const name = `avatar-${Date.now()}${extname(file.originalname)}`;
        cb(null, name);
      },
    }),
  }))
  async uploadAvatar(@Req() req, @UploadedFile() file:any) {
    return this.profileService.updateAvatar(req.user.userId, file.path);
  }

  @Get('all/list')
@ApiOperation({ summary: 'Internal: List all user IDs for testing' })
@Get('all/list')
  async listAll() {
    return this.prisma.user.findMany({
      select: { id: true, name: true, phone: true }
    });
  }
}