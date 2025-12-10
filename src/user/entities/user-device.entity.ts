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
 * 사용자 기기 관리 정보
 * 푸시 구독과 분리된 독립적인 기기 관리 시스템
 */
@Entity('user_devices')
@Unique(['userId', 'deviceId']) // userId와 deviceId 조합으로 고유 제약
export class UserDevice {
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

  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent?: string; // 디바이스 정보 (선택)

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastLoginAt: Date;

  @Column({ type: 'boolean', default: true })
  isActive: boolean; // 활성화 상태

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

