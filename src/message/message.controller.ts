import { Controller, Post, Get, Body, UseGuards, Req, UseInterceptors, UploadedFile, Query, Param, Delete } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MessageService } from './message.service';
import { SendMessageDto } from './dto/message.dto'; // Import your DTO
import { diskStorage } from 'multer';
import { extname } from 'path';

@ApiTags('Messages') // Groups endpoints in Swagger UI
@ApiBearerAuth()     // Shows the Padlock icon for JWT
@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post('send')
  @ApiOperation({ summary: 'Send a new message with optional file upload' })
  @ApiConsumes('multipart/form-data') // Required for File Uploads in Swagger
  @ApiBody({ type: SendMessageDto })
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const name = Date.now() + extname(file.originalname);
        cb(null, name);
      },
    }),
  }))
  async sendMessage(@Req() req, @UploadedFile() file, @Body() body: SendMessageDto) {
    const fileUrl = file ? file.path : null;
    return this.messageService.createMessage(req.user.userId, { ...body, fileUrl });
  }

  @Get('inbox')
  @ApiOperation({ summary: 'Get the latest conversations for the logged-in user' })
  async getInbox(@Req() req) {
    return this.messageService.getInbox(req.user.userId);
  }

  @Get('history/:partnerId')
  @ApiOperation({ summary: 'Get chat history between you and a specific user' })
  @ApiQuery({ name: 'cursor', required: false, type: Number, description: 'Last message ID for pagination' })
  async getHistory(@Req() req, @Param('partnerId') partnerId: string, @Query('cursor') cursor: string) {
    return this.messageService.getChatHistory(req.user.userId, +partnerId, cursor ? +cursor : undefined);
  }

  @Delete(':id/revoke')
  @ApiOperation({ summary: 'Revoke a message (Delete for everyone)' })
  async revokeMessage(@Req() req, @Param('id') id: string) {
    return this.messageService.deleteForEveryone(+id, req.user.userId);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search across all messages or within a specific chat' })
  @ApiQuery({ name: 'q', required: true, description: 'The search keyword' })
  @ApiQuery({ name: 'partnerId', required: false, description: 'Filter search to a specific user' })
  async search(@Req() req, @Query('q') query: string, @Query('partnerId') partnerId?: string) {
    if (!query) return [];
    return this.messageService.searchMessages(
      req.user.userId,
      query,
      partnerId ? +partnerId : undefined,
    );
  }
}