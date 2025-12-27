import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards, Request, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatAlbumService } from './chat-album.service';

@Controller('chat/album')
@UseGuards(JwtAuthGuard)
export class ChatAlbumController {
  private readonly logger = new Logger(ChatAlbumController.name);

  constructor(private readonly albumService: ChatAlbumService) {}

  // ⚠️ 라우팅 순서 중요: 구체적인 경로가 먼저 와야 함
  
  // 사진첩 전체 개수 조회
  @Get(':roomId/count')
  async getAlbumCount(
    @Param('roomId') roomId: string,
    @Query('folderId') folderId?: string,
  ) {
    const count = await this.albumService.getRoomAlbumCount(roomId, folderId);
    return { count };
  }
  
  // 폴더 목록 조회
  @Get(':roomId/folders')
  async getFolders(@Param('roomId') roomId: string) {
    const folders = await this.albumService.getFolders(roomId);
    return folders;
  }

  // 폴더 생성
  @Post(':roomId/folders')
  async createFolder(
    @Param('roomId') roomId: string,
    @Body() data: { name: string; description?: string; parentId?: string },
    @Request() req,
  ) {
    const folder = await this.albumService.createFolder(roomId, req.user.userId, data.name, data.description, data.parentId);
    return folder;
  }

  // 폴더별 사진 조회 (페이지네이션 지원)
  @Get(':roomId/folders/:folderId')
  async getAlbumsByFolder(
    @Param('roomId') roomId: string,
    @Param('folderId') folderId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    const result = await this.albumService.getAlbumsByFolder(roomId, folderId, limitNum, offsetNum);
    return result;
  }

  // 폴더 삭제
  @Delete(':roomId/folders/:folderId')
  async deleteFolder(
    @Param('folderId') folderId: string,
    @Request() req,
  ) {
    await this.albumService.deleteFolder(folderId, req.user.userId);
    return { success: true };
  }

  // 채팅방 사진첩 조회 (루트 또는 전체, 페이지네이션 지원, 루트는 메시지 사진 포함)
  @Get(':roomId')
  async getRoomAlbum(
    @Param('roomId') roomId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('folderId') folderId?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    // folderId가 없거나 빈 문자열이면 루트 폴더 (null)
    const folderIdParam = folderId === undefined || folderId === '' ? null : folderId;
    const result = await this.albumService.getRoomAlbum(roomId, limitNum, offsetNum, folderIdParam);
    return result;
  }

  // 사진첩에 파일 추가
  @Post(':roomId')
  async addToAlbum(
    @Param('roomId') roomId: string,
    @Body() data: {
      type: 'image' | 'video';
      fileUrl: string;
      thumbnailUrl?: string;
      fileName: string;
      fileSize: number;
      folderId?: string;
    },
    @Request() req,
  ) {
    const album = await this.albumService.addToAlbum(
      roomId,
      req.user.userId,
      data,
    );
    return album;
  }

  // 사진첩에서 여러 파일 일괄 삭제 (⚠️ 라우팅 순서: batch가 :albumId보다 먼저 와야 함)
  @Delete('batch')
  async deleteMultipleFromAlbum(
    @Body() data: { albumIds: string[] },
    @Request() req,
  ) {
    const result = await this.albumService.deleteMultipleFromAlbum(data.albumIds, req.user.userId);
    return result;
  }

  // 사진첩에서 파일 삭제
  @Delete(':albumId')
  async deleteFromAlbum(
    @Param('albumId') albumId: string,
    @Request() req,
  ) {
    await this.albumService.deleteFromAlbum(albumId, req.user.userId);
    return { success: true };
  }
}

