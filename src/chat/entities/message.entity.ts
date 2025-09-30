import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ChatRoom } from './chat-room.entity';

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
    enum: ['text', 'image', 'video', 'file'],
    default: 'text'
  })
  type: 'text' | 'image' | 'video' | 'file';

  @Column({ nullable: true })
  fileUrl?: string;

  @Column({ nullable: true })
  fileName?: string;

  @Column({ nullable: true })
  fileSize?: number;

  @CreateDateColumn()
  timestamp: Date;

  @ManyToOne(() => ChatRoom, room => room.messages)
  @JoinColumn({ name: 'roomId' })
  room: ChatRoom;
}
