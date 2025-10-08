import { Entity, Column, CreateDateColumn, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { ChatRoom } from './chat-room.entity';
import { User } from '../../user/entities/user.entity';

@Entity('chat_room_participants')
export class ChatRoomParticipant {
  @PrimaryColumn('uuid')
  roomId: string;

  @PrimaryColumn('uuid')
  userId: string;

  @Column({ 
    type: 'enum', 
    enum: ['owner', 'admin', 'member'],
    default: 'member' 
  })
  role: 'owner' | 'admin' | 'member';

  @Column({ type: 'uuid', nullable: true })
  lastReadMessageId?: string;

  @Column({ type: 'boolean', default: false })
  muted: boolean;

  @Column({ type: 'boolean', default: false })
  pinned: boolean;

  @CreateDateColumn()
  joinedAt: Date;

  @ManyToOne(() => ChatRoom, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roomId' })
  room: ChatRoom;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}

