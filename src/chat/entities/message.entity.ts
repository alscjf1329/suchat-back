import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ChatRoom } from './chat-room.entity';
import { User } from '../../user/entities/user.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  roomId: string;

  @Column()
  userId: string;

  @Column('text')
  content: string;

  @Column({ 
    type: 'enum', 
    enum: ['text', 'image', 'video', 'file', 'images'],
    default: 'text'
  })
  type: 'text' | 'image' | 'video' | 'file' | 'images';

  @Column({ nullable: true })
  fileUrl?: string;

  @Column({ nullable: true })
  fileName?: string;

  @Column({ nullable: true })
  fileSize?: number;

  // 여러 파일을 위한 JSON 필드
  @Column({ type: 'json', nullable: true })
  files?: Array<{
    fileUrl: string;
    fileName: string;
    fileSize: number;
    thumbnailUrl?: string;
  }>;

  @CreateDateColumn()
  timestamp: Date;

  @ManyToOne(() => ChatRoom, room => room.messages)
  @JoinColumn({ name: 'roomId' })
  room: ChatRoom;

  @ManyToOne(() => User, user => user.messages, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user?: User;
}
