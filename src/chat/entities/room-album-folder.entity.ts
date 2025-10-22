import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { ChatRoom } from './chat-room.entity';
import { RoomAlbum } from './room-album.entity';

@Entity('room_album_folders')
export class RoomAlbumFolder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  roomId: string;

  @Column({ type: 'varchar', length: 100 })
  name: string; // 폴더명

  @Column({ type: 'uuid' })
  createdBy: string; // 폴더 생성자

  @Column({ type: 'text', nullable: true })
  description?: string; // 폴더 설명

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => ChatRoom)
  @JoinColumn({ name: 'roomId' })
  room: ChatRoom;

  @OneToMany(() => RoomAlbum, album => album.folder)
  albums: RoomAlbum[];
}

