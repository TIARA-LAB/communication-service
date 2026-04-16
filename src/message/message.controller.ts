import { 
  Controller, Post, Get, Body, UseGuards, Req, 
  UseInterceptors, UploadedFile, Query, Param, 
  Delete, Patch 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { 
  ApiTags, ApiOperation, ApiBearerAuth, 
  ApiConsumes, ApiBody, ApiQuery 
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MessageService } from './message.service';
import { SendMessageDto } from './dto/message.dto';
import { diskStorage } from 'multer';
import { extname } from 'path';

@ApiTags('Messages')
@ApiBearerAuth()
@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post('send')
  @ApiOperation({ summary: 'Send a new message with optional file upload' })
  @ApiConsumes('multipart/form-data')
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
  @ApiOperation({ summary: 'Get the latest conversations' })
  async getInbox(@Req() req) {
    return this.messageService.getInbox(req.user.userId);
  }

  @Get('history/:partnerId')
  @ApiOperation({ summary: 'Get chat history between you and a specific user' })
  @ApiQuery({ name: 'cursor', required: false, type: Number })
  async getHistory(@Req() req, @Param('partnerId') partnerId: string, @Query('cursor') cursor: string) {
    return this.messageService.getChatHistory(req.user.userId, +partnerId, cursor ? +cursor : undefined);
  }

  @Delete(':id/revoke')
  @ApiOperation({ summary: 'Revoke a message (Delete for everyone)' })
  async revokeMessage(@Req() req, @Param('id') id: string) {
    return this.messageService.deleteForEveryone(+id, req.user.userId);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search across all messages' })
  async search(@Req() req, @Query('q') query: string, @Query('partnerId') partnerId?: string) {
    if (!query) return [];
    return this.messageService.searchMessages(req.user.userId, query, partnerId ? +partnerId : undefined);
  }

  @Patch(':id/edit')
  @ApiOperation({ summary: 'Edit a message content' })
  async edit(@Req() req, @Param('id') id: string, @Body('content') content: string) {
    return this.messageService.editMessage(req.user.userId, +id, content);
  }

  @Post(':id/forward')
  @ApiOperation({ summary: 'Forward a message to another user' })
  async forward(@Req() req, @Param('id') id: string, @Body('receiverId') receiverId: number) {
    return this.messageService.forwardMessage(req.user.userId, +id, +receiverId);
  }

  @Post(':id/star')
  @ApiOperation({ summary: 'Star or unstar a message' })
  async star(@Req() req, @Param('id') id: string) {
    return this.messageService.toggleStar(req.user.userId, +id);
  }

  @Get('starred')
  @ApiOperation({ summary: 'View all your starred messages' })
  async getStarred(@Req() req) {
    return this.messageService.getStarredMessages(req.user.userId);
  }

  @Patch(':id/pin')
  @ApiOperation({ summary: 'Pin or unpin a message' })
  async pin(@Param('id') id: string, @Body('isPinned') isPinned: boolean) {
    return this.messageService.pinMessage(+id, isPinned);
  }
}