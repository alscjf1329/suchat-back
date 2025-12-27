import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { RoomAlbum, RoomAlbumFolder } from './entities';
import { Message } from './entities/message.entity';

@Injectable()
export class ChatAlbumService {
  private readonly logger = new Logger(ChatAlbumService.name);

  constructor(
    @InjectRepository(RoomAlbum)
    private readonly albumRepository: Repository<RoomAlbum>,
    @InjectRepository(RoomAlbumFolder)
    private readonly folderRepository: Repository<RoomAlbumFolder>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
  ) {}

  // 채팅방 사진첩 전체 개수 조회 (루트 폴더는 메시지 사진 포함)
  async getRoomAlbumCount(roomId: string, folderId?: string | null): Promise<number> {
    let albumCount = 0;
    
    // 사진첩에 직접 업로드한 사진 개수
    const albumQueryBuilder = this.albumRepository
      .createQueryBuilder('album')
      .where('album.roomId = :roomId', { roomId });
    
    if (folderId !== undefined && folderId !== null) {
      if (folderId === '') {
        // 루트 폴더 (folderId가 null인 것)
        albumQueryBuilder.andWhere('album.folderId IS NULL');
        albumCount = await albumQueryBuilder.getCount();
        
        // 채팅 메시지의 이미지/비디오 개수 추가
        const messages = await this.messageRepository.find({
          where: {
            roomId,
            type: In(['image', 'video', 'images']),
          },
        });
        
        // 메시지의 파일 개수 계산 (images 타입은 여러 파일 포함)
        let messageFileCount = 0;
        for (const message of messages) {
          if (message.type === 'images' && message.files) {
            messageFileCount += message.files.length;
          } else if (message.fileUrl) {
            messageFileCount += 1;
          }
        }
        
        albumCount += messageFileCount;
        return albumCount;
      } else {
        // 특정 폴더
        albumQueryBuilder.andWhere('album.folderId = :folderId', { folderId });
        albumCount = await albumQueryBuilder.getCount();
        return albumCount;
      }
    } else {
      // folderId가 undefined면 루트 폴더 조회 시 메시지 사진도 포함
      albumQueryBuilder.andWhere('album.folderId IS NULL');
      albumCount = await albumQueryBuilder.getCount();
      
      // 채팅 메시지의 이미지/비디오 개수 추가
      const messages = await this.messageRepository.find({
        where: {
          roomId,
          type: In(['image', 'video', 'images']),
        },
      });
      
      // 메시지의 파일 개수 계산 (images 타입은 여러 파일 포함)
      let messageFileCount = 0;
      for (const message of messages) {
        if (message.type === 'images' && message.files) {
          messageFileCount += message.files.length;
        } else if (message.fileUrl) {
          messageFileCount += 1;
        }
      }
      
      albumCount += messageFileCount;
      return albumCount;
    }
  }

  // 채팅방 사진첩 조회 (최신순, 페이지네이션 지원, 루트 폴더는 메시지 사진 포함)
  async getRoomAlbum(roomId: string, limit: number = 50, offset: number = 0, folderId?: string | null): Promise<{ albums: RoomAlbum[]; total: number }> {
    // folderId가 없거나 null이면 루트 폴더 조회 (메시지 사진 포함)
    const includeMessages = folderId === undefined || folderId === null;
    
    // 사진첩에 직접 업로드한 사진 조회
    const albumQueryBuilder = this.albumRepository
      .createQueryBuilder('album')
      .where('album.roomId = :roomId', { roomId })
      .andWhere('album.folderId IS NULL');
    
    // 채팅 메시지의 이미지/비디오 조회
    let messageAlbums: any[] = [];
    if (includeMessages) {
      const messages = await this.messageRepository.find({
        where: {
          roomId,
          type: In(['image', 'video', 'images']),
        },
        order: { timestamp: 'DESC' },
      });
      
      // 메시지를 RoomAlbum 형식으로 변환
      messageAlbums = messages.flatMap((message) => {
        if (message.type === 'images' && message.files) {
          // 여러 파일이 있는 경우
          return message.files.map((file) => ({
            id: `${message.id}-${file.fileUrl}`, // 고유 ID 생성
            roomId: message.roomId,
            folderId: null,
            uploadedBy: message.userId,
            type: file.fileUrl.match(/\.(mp4|webm|mov|m4v)$/i) ? 'video' : 'image',
            fileUrl: file.fileUrl,
            thumbnailUrl: file.thumbnailUrl,
            fileName: file.fileName,
            fileSize: file.fileSize,
            uploadedAt: message.timestamp,
            fromMessage: true, // 메시지에서 온 것임을 표시
          }));
        } else if (message.fileUrl) {
          // 단일 파일
          return [{
            id: `${message.id}-${message.fileUrl}`,
            roomId: message.roomId,
            folderId: null,
            uploadedBy: message.userId,
            type: message.type === 'video' ? 'video' : 'image',
            fileUrl: message.fileUrl,
            thumbnailUrl: undefined,
            fileName: message.fileName || message.fileUrl.split('/').pop() || 'file',
            fileSize: message.fileSize || 0,
            uploadedAt: message.timestamp,
            fromMessage: true,
          }];
        }
        return [];
      });
    }
    
    // 사진첩 사진과 메시지 사진을 합치고 정렬
    const [albums, albumTotal] = await albumQueryBuilder.getManyAndCount();
    const allAlbums = [...messageAlbums, ...albums];
    
    // uploadedAt 기준으로 정렬
    allAlbums.sort((a, b) => {
      const dateA = a.uploadedAt instanceof Date ? a.uploadedAt : new Date(a.uploadedAt);
      const dateB = b.uploadedAt instanceof Date ? b.uploadedAt : new Date(b.uploadedAt);
      return dateB.getTime() - dateA.getTime();
    });
    
    // 페이지네이션 적용
    const total = allAlbums.length;
    const paginatedAlbums = allAlbums.slice(offset, offset + limit);
    
    this.logger.log(`[getRoomAlbum] ${paginatedAlbums.length}개 조회됨 (전체: ${total}개, 메시지: ${messageAlbums.length}개, 사진첩: ${albums.length}개)`);
    
    return { albums: paginatedAlbums, total };
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

