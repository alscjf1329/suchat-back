import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
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

  // 채팅방 사진첩 조회 (최신순, 페이지네이션 지원)
  async getRoomAlbum(roomId: string, limit: number = 50, offset: number = 0): Promise<{ albums: RoomAlbum[]; total: number }> {
    const queryBuilder = this.albumRepository
      .createQueryBuilder('album')
      .where('album.roomId = :roomId', { roomId })
      .orderBy('album.uploadedAt', 'DESC')
      .take(limit)
      .skip(offset);
    
    const [albums, total] = await queryBuilder.getManyAndCount();
    
    this.logger.log(`[getRoomAlbum] ${albums.length}개 조회됨 (전체: ${total}개)`);
    
    return { albums, total };
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

  // 사진첩에서 여러 파일 일괄 삭제 (본인만 가능)
  async deleteMultipleFromAlbum(albumIds: string[], userId: string): Promise<{ deleted: number; failed: number }> {
    if (!albumIds || albumIds.length === 0) {
      return { deleted: 0, failed: 0 };
    }

    // 본인이 업로드한 파일만 조회
    const albums = await this.albumRepository.find({
      where: {
        id: In(albumIds),
        uploadedBy: userId,
      },
    });

    const validAlbumIds = albums.map(album => album.id);
    const deletedCount = validAlbumIds.length;
    const failedCount = albumIds.length - deletedCount;

    if (validAlbumIds.length > 0) {
      await this.albumRepository.delete(validAlbumIds);
    }

    return { deleted: deletedCount, failed: failedCount };
  }

  // 폴더 목록 조회 (트리 구조)
  async getFolders(roomId: string): Promise<RoomAlbumFolder[]> {
    const folders = await this.folderRepository.find({
      where: { roomId },
      order: { createdAt: 'ASC' },
      relations: ['children'],
    });
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

  // 폴더별 사진 조회 (페이지네이션 지원)
  async getAlbumsByFolder(roomId: string, folderId: string, limit: number = 50, offset: number = 0): Promise<{ albums: RoomAlbum[]; total: number }> {
    const queryBuilder = this.albumRepository
      .createQueryBuilder('album')
      .where('album.roomId = :roomId', { roomId })
      .andWhere('album.folderId = :folderId', { folderId })
      .orderBy('album.uploadedAt', 'DESC')
      .take(limit)
      .skip(offset);
    
    const [albums, total] = await queryBuilder.getManyAndCount();
    
    return { albums, total };
  }

  // 폴더 삭제 (본인만 가능, 하위 폴더도 함께 삭제)
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

    // 재귀적으로 하위 폴더들도 함께 삭제
    await this.deleteFolderRecursive(folderId, userId);

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

  // 재귀적으로 하위 폴더 삭제
  private async deleteFolderRecursive(folderId: string, userId: string): Promise<void> {
    // 하위 폴더들 조회
    const childFolders = await this.folderRepository.find({
      where: { parentId: folderId },
    });

    // 각 하위 폴더에 대해 재귀적으로 삭제
    for (const childFolder of childFolders) {
      // 본인이 생성한 폴더만 삭제 가능
      if (childFolder.createdBy === userId) {
        // 하위 폴더의 하위 폴더들도 재귀적으로 삭제
        await this.deleteFolderRecursive(childFolder.id, userId);

        // 하위 폴더 내 파일들을 루트로 이동
        await this.albumRepository
          .createQueryBuilder()
          .update(RoomAlbum)
          .set({ folderId: () => 'NULL' })
          .where('folderId = :childFolderId', { childFolderId: childFolder.id })
          .execute();

        // 하위 폴더 삭제
        await this.folderRepository.delete(childFolder.id);
      }
    }
  }
}

