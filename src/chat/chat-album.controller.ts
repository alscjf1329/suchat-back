import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatAlbumService } from './chat-album.service';

@Controller('chat/album')
@UseGuards(JwtAuthGuard)
export class ChatAlbumController {
  private readonly logger = new Logger(ChatAlbumController.name);

  constructor(private readonly albumService: ChatAlbumService) {}

  // ⚠️ 라우팅 순서 중요: 구체적인 경로가 먼저 와야 함
  
  // 폴더 목록 조회
  @Get(':roomId/folders')
  async getFolders(@Param('roomId') roomId: string) {
    this.logger.log(`[getFolders] 폴더 목록 조회: roomId=${roomId}`);
    const folders = await this.albumService.getFolders(roomId);
    this.logger.debug(`[getFolders] ${folders.length}개 폴더 조회됨`);
    return folders;
  }

  // 폴더 생성
  @Post(':roomId/folders')
  async createFolder(
    @Param('roomId') roomId: string,
    @Body() data: { name: string; description?: string },
    @Request() req,
  ) {
    this.logger.log(`[createFolder] 폴더 생성: roomId=${roomId}, name=${data.name}, userId=${req.user.userId}`);
    this.logger.debug(`[createFolder] 요청 데이터:`, data);
    const folder = await this.albumService.createFolder(roomId, req.user.userId, data.name, data.description);
    this.logger.log(`[createFolder] 폴더 생성 완료: folderId=${folder.id}`);
    return folder;
  }

  // 폴더별 사진 조회
  @Get(':roomId/folders/:folderId')
  async getAlbumsByFolder(
    @Param('roomId') roomId: string,
    @Param('folderId') folderId: string,
  ) {
    this.logger.log(`[getAlbumsByFolder] 폴더별 사진 조회: folderId=${folderId}`);
    const albums = await this.albumService.getAlbumsByFolder(roomId, folderId);
    this.logger.debug(`[getAlbumsByFolder] ${albums.length}개 사진 조회됨`);
    return albums;
  }

  // 폴더 삭제
  @Delete(':roomId/folders/:folderId')
  async deleteFolder(
    @Param('folderId') folderId: string,
    @Request() req,
  ) {
    this.logger.log(`[deleteFolder] 폴더 삭제: folderId=${folderId}`);
    await this.albumService.deleteFolder(folderId, req.user.userId);
    return { success: true };
  }

  // 채팅방 사진첩 조회 (루트 또는 전체)
  @Get(':roomId')
  async getRoomAlbum(@Param('roomId') roomId: string) {
    this.logger.log(`[getRoomAlbum] 사진첩 조회: roomId=${roomId}`);
    const albums = await this.albumService.getRoomAlbum(roomId);
    this.logger.debug(`[getRoomAlbum] ${albums.length}개 사진 조회됨`);
    return albums;
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
    this.logger.log(`[addToAlbum] 사진첩에 추가: roomId=${roomId}, type=${data.type}, fileName=${data.fileName}, folderId=${data.folderId || 'root'}`);
    const album = await this.albumService.addToAlbum(
      roomId,
      req.user.userId,
      data,
    );
    this.logger.debug(`[addToAlbum] 추가 완료: albumId=${album.id}`);
    return album;
  }

  // 사진첩에서 파일 삭제
  @Delete(':albumId')
  async deleteFromAlbum(
    @Param('albumId') albumId: string,
    @Request() req,
  ) {
    this.logger.log(`[deleteFromAlbum] 사진 삭제: albumId=${albumId}`);
    await this.albumService.deleteFromAlbum(albumId, req.user.userId);
    return { success: true };
  }
}

