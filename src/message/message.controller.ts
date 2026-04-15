import { Controller, Post, Get, Body, UseGuards, Req, UseInterceptors, UploadedFile, Query, Patch, Param, Delete } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MessageService } from './message.service';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post('send')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const name = Date.now() + extname(file.originalname);
        cb(null, name);
      },
    }),
  }))
  async sendMessage(@Req() req, @UploadedFile() file, @Body() body: any) {
    const fileUrl = file ? file.path : null;
    return this.messageService.createMessage(req.user.userId, { ...body, fileUrl });
  }

  @Get('inbox')
  async getInbox(@Req() req) {
    return this.messageService.getInbox(req.user.userId);
  }

  @Get('history/:partnerId')
  async getHistory(@Req() req, @Param('partnerId') partnerId: string, @Query('cursor') cursor: string) {
    return this.messageService.getChatHistory(req.user.userId, +partnerId, cursor ? +cursor : undefined);
  }

  @Delete(':id/revoke')
  async revokeMessage(@Req() req, @Param('id') id: string) {
    return this.messageService.deleteForEveryone(+id, req.user.userId);
  }
  @Get('search')
  async search(@Req() req, @Query('q') query: string, @Query('partnerId') partnerId?: string) {
    if (!query) return [];
    return this.messageService.searchMessages(
      req.user.userId,
      query,
      partnerId ? +partnerId : undefined,
    );
  }
}