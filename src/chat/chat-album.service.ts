import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoomAlbum, RoomAlbumFolder } from './entities';

@Injectable()
export class ChatAlbumService {
  private readonly logger = new Logger(ChatAlbumService.name);

  constructor(
    @InjectRepository(RoomAlbum)
    private readonly albumRepository: Repository<RoomAlbum>,
    @InjectRepository(RoomAlbumFolder)
    private readonly folderRepository: Repository<RoomAlbumFolder>,
  ) {}

  // 채팅방 사진첩 조회 (최신순)
  async getRoomAlbum(roomId: string): Promise<RoomAlbum[]> {
    this.logger.debug(`[getRoomAlbum] 조회 시작: roomId=${roomId}`);
    const albums = await this.albumRepository.find({
      where: { roomId },
      order: { uploadedAt: 'DESC' },
    });
    this.logger.log(`[getRoomAlbum] ${albums.length}개 조회됨`);
    return albums;
  }

  // 사진첩에 파일 추가
  async addToAlbum(
    roomId: string,
    uploadedBy: string,
    data: {
      type: 'image' | 'video';
      fileUrl: string;
      thumbnailUrl?: string;
      fileName: string;
      fileSize: number;
      folderId?: string;
    },
  ): Promise<RoomAlbum> {
    const album = this.albumRepository.create({
      roomId,
      uploadedBy,
      ...data,
    });

    return await this.albumRepository.save(album);
  }

  // 사진첩에서 파일 삭제 (본인만 가능)
  async deleteFromAlbum(albumId: string, userId: string): Promise<void> {
    const album = await this.albumRepository.findOne({
      where: { id: albumId },
    });

    if (!album) {
      throw new NotFoundException('사진을 찾을 수 없습니다.');
    }

    // 본인이 업로드한 파일만 삭제 가능
    if (album.uploadedBy !== userId) {
      throw new ForbiddenException('본인이 업로드한 파일만 삭제할 수 있습니다.');
    }

    await this.albumRepository.delete(albumId);
  }

  // 폴더 목록 조회 (트리 구조)
  async getFolders(roomId: string): Promise<RoomAlbumFolder[]> {
    this.logger.debug(`[getFolders] 폴더 조회: roomId=${roomId}`);
    const folders = await this.folderRepository.find({
      where: { roomId },
      order: { createdAt: 'ASC' },
      relations: ['children'],
    });
    this.logger.log(`[getFolders] ${folders.length}개 폴더 조회됨`);
    return folders;
  }

  // 폴더 생성
  async createFolder(
    roomId: string, 
    createdBy: string, 
    name: string, 
    description?: string,
    parentId?: string
  ): Promise<RoomAlbumFolder> {
    const folder = this.folderRepository.create({
      roomId,
      createdBy,
      name,
      description,
      parentId,
    });
    return await this.folderRepository.save(folder);
  }

  // 폴더별 사진 조회
  async getAlbumsByFolder(roomId: string, folderId: string): Promise<RoomAlbum[]> {
    return await this.albumRepository.find({
      where: { roomId, folderId },
      order: { uploadedAt: 'DESC' },
    });
  }

  // 폴더 삭제 (본인만 가능)
  async deleteFolder(folderId: string, userId: string): Promise<void> {
    const folder = await this.folderRepository.findOne({
      where: { id: folderId },
    });

    if (!folder) {
      throw new NotFoundException('폴더를 찾을 수 없습니다.');
    }

    // 본인이 생성한 폴더만 삭제 가능
    if (folder.createdBy !== userId) {
      throw new ForbiddenException('본인이 생성한 폴더만 삭제할 수 있습니다.');
    }

    // 폴더 내 파일들을 루트로 이동 (folderId를 제거)
    await this.albumRepository
      .createQueryBuilder()
      .update(RoomAlbum)
      .set({ folderId: () => 'NULL' })
      .where('folderId = :folderId', { folderId })
      .execute();

    // 폴더 삭제
    await this.folderRepository.delete(folderId);
  }
}

