import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { Schedule } from './schedule.entity';
import { User } from '../../user/entities/user.entity';

@Entity('schedule_participants')
@Unique(['scheduleId', 'userId'])
export class ScheduleParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  scheduleId: string;

  @Column({ type: 'uuid' })
  userId: string; // 참여자 ID

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Schedule, schedule => schedule.participants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'scheduleId' })
  schedule: Schedule;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}

