import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ChatRoom } from './chat-room.entity';
import { RoomAlbumFolder } from './room-album-folder.entity';

@Entity('room_albums')
export class RoomAlbum {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  roomId: string;

  @Column({ type: 'uuid', nullable: true })
  folderId?: string; // 폴더 ID (null이면 루트)

  @Column({ type: 'uuid' })
  uploadedBy: string; // 업로드한 사용자 ID

  @Column({ type: 'varchar', length: 10 })
  type: 'image' | 'video'; // 파일 타입

  @Column({ type: 'varchar', length: 500 })
  fileUrl: string; // 파일 URL

  @Column({ type: 'varchar', length: 500, nullable: true })
  thumbnailUrl?: string; // 썸네일 URL

  @Column({ type: 'varchar', length: 255 })
  fileName: string; // 원본 파일명

  @Column({ type: 'integer' })
  fileSize: number; // 파일 크기

  @CreateDateColumn()
  uploadedAt: Date;

  @ManyToOne(() => ChatRoom)
  @JoinColumn({ name: 'roomId' })
  room: ChatRoom;

  @ManyToOne(() => RoomAlbumFolder, { nullable: true })
  @JoinColumn({ name: 'folderId' })
  folder?: RoomAlbumFolder;
}

