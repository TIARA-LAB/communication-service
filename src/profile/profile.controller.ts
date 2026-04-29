import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  UnauthorizedException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { GetProfileResponseDto } from './dto/get-profile-response.dto';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { PrismaService } from 'src/prisma/prisma.service';

@ApiTags('User Profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('profile')
export class ProfileController {
  constructor(
    private readonly profileService: ProfileService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get my own profile' })
  @ApiResponse({ status: 200, description: 'Profile returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(@Req() req) {
    if (!req.user || !req.user.userId) {
      throw new UnauthorizedException('User ID not found in request');
    }
    return this.profileService.getProfile(req.user.userId);
  }

  @Patch('update')
  @ApiOperation({ summary: 'Update your Name or About status' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid update payload' })
  async update(@Req() req, @Body() body: UpdateProfileDto) {
    return this.profileService.updateInfo(req.user.userId, body);
  }

  @Post('avatar')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update profile picture' })
  @ApiResponse({ status: 200, description: 'Avatar uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file upload' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/profiles',
        filename: (req, file, cb) => {
          const name = `avatar-${Date.now()}${extname(file.originalname)}`;
          cb(null, name);
        },
      }),
    }),
  )
  async uploadAvatar(@Req() req, @UploadedFile() file: any) {
    return this.profileService.updateAvatar(req.user.userId, file.path);
  }

  @Get('all/list')
  @ApiOperation({ summary: 'Internal: List all user IDs for testing' })
  @ApiResponse({ status: 200, description: 'List of users returned' })
  async listAll() {
    return this.prisma.user.findMany({
      select: { id: true, name: true, phone: true },
    });
  }
}
