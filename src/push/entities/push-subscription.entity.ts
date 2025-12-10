import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

/**
 * 푸시 알림 구독 정보
 * 사용자별 여러 기기 지원 (iOS, Android, Desktop, Tablet 등)
 */
@Entity('push_subscriptions')
@Unique(['userId', 'deviceId']) // userId와 deviceId 조합으로 고유 제약
export class PushSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  deviceId: string; // 기기 고유 ID (브라우저/앱별 고유값)

  @Column({ type: 'varchar', length: 50 })
  deviceType: string; // 'ios', 'android', 'desktop', 'tablet'

  @Column({ type: 'varchar', length: 255, nullable: true })
  deviceName?: string; // 기기 이름 (선택)

  @Column({ type: 'text' })
  endpoint: string; // 푸시 서버 URL

  @Column({ type: 'varchar', length: 255 })
  p256dh: string; // 암호화 공개키

  @Column({ type: 'varchar', length: 255 })
  auth: string; // 인증 시크릿

  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent?: string; // 디바이스 정보 (선택)

  @Column({ type: 'boolean', default: true })
  isActive: boolean; // 활성화 상태

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

