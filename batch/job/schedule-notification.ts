/**
 * 배치 프로세스: 일정 조회 후 알림 전송 (최적화 버전)
 * 
 * 사용법:
 *   pnpm run batch:notification
 *   또는: pnpm exec ts-node -r tsconfig-paths/register batch/job/schedule-notification.ts
 *   또는 빌드 후: node dist/batch/job/schedule-notification.js
 * 
 * 환경변수:
 *   BATCH_USER_ID - 특정 사용자에게만 푸시 전송 (선택사항, 없으면 모든 일정 조회)
 *   BATCH_CONCURRENT_LIMIT - 동시 알림 전송 제한 (기본값: 10)
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../src/app.module';
import { PushService } from '../../src/push/push.service';
import { SendPushJobData } from '../../src/push/dto/subscribe.dto';
import { DataSource } from 'typeorm';

// 동시 실행 제한 (기본값: 10)
const CONCURRENT_LIMIT = parseInt(process.env.BATCH_CONCURRENT_LIMIT || '10', 10);

/**
 * 동시 실행 제어를 위한 세마포어
 */
class Semaphore {
  private count: number;
  private waiting: Array<() => void> = [];

  constructor(count: number) {
    this.count = count;
  }

  async acquire(): Promise<void> {
    if (this.count > 0) {
      this.count--;
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.waiting.push(resolve);
    });
  }

  release(): void {
    if (this.waiting.length > 0) {
      const resolve = this.waiting.shift();
      if (resolve) resolve();
    } else {
      this.count++;
    }
  }
}

/**
 * 배치로 알림 전송 (동시 실행 제어)
 */
async function sendNotificationsBatch(
  pushService: PushService,
  notifications: Array<{ userId: string; data: SendPushJobData; scheduleTitle?: string; scheduleId?: string }>,
  semaphore: Semaphore
): Promise<{ success: number; failed: number; successfulScheduleIds: Set<string> }> {
  let success = 0;
  let failed = 0;
  const successfulScheduleIds = new Set<string>();

  const promises = notifications.map(async ({ userId, data, scheduleId }) => {
    await semaphore.acquire();
    try {
      await pushService.sendPushNotification(data);
      success++;
      if (scheduleId) {
        successfulScheduleIds.add(scheduleId);
      }
      return { userId, scheduleId, success: true };
    } catch (error) {
      failed++;
      console.error(`  ❌ 알림 전송 실패 (사용자 ${userId}):`, error);
      return { userId, scheduleId, success: false, error };
    } finally {
      semaphore.release();
    }
  });

  await Promise.allSettled(promises);
  return { success, failed, successfulScheduleIds };
}

async function batchPushProcess() {
  const startTime = Date.now();
  
  // NestJS 애플리케이션 컨텍스트 초기화
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    // 서비스 인스턴스 가져오기
    const pushService = app.get(PushService);
    const dataSource = app.get(DataSource);

    // 현재 시간을 yyyymmddHH24mmss 형식으로 변환
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // 현재 시간의 분 단위로 변환 (초는 00으로)
    const currentTime = new Date(now);
    currentTime.setSeconds(0, 0);
    
    // yyyymmddHH24mmss 형식으로 변환
    const formatDateToString = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}${month}${day}${hours}${minutes}${seconds}`;
    };
    
    const parseDateFromString = (dateStr: string): Date => {
      if (!dateStr || dateStr.length !== 14) {
        throw new Error(`Invalid date format: ${dateStr}`);
      }
      const year = parseInt(dateStr.substring(0, 4), 10);
      const month = parseInt(dateStr.substring(4, 6), 10) - 1;
      const day = parseInt(dateStr.substring(6, 8), 10);
      const hours = parseInt(dateStr.substring(8, 10), 10);
      const minutes = parseInt(dateStr.substring(10, 12), 10);
      const seconds = parseInt(dateStr.substring(12, 14), 10);
      return new Date(year, month, day, hours, minutes, seconds);
    };
    
    const currentTimeStr = formatDateToString(currentTime);
    
    console.log(`📅 일정 조회 시작: ${currentTimeStr}`);
    console.log(`⏰ 현재 시간: ${currentHour}:${currentMinute.toString().padStart(2, '0')}`);

    // 순수 SQL 쿼리: 알림 시간이 현재 시간과 일치하는 일정과 참여자 정보를 함께 조회
    // 참여자가 있는 경우만 조회 (INNER JOIN)
    // notificationDateTime이 현재 시간(분 단위)과 일치하고, 아직 전송되지 않은 일정만 조회
    const query = `
      SELECT 
        s.id as schedule_id,
        s."roomId" as room_id,
        s.title as schedule_title,
        s.memo,
        s."startDate" as start_date,
        sp."userId" as user_id
      FROM schedules s
      INNER JOIN schedule_participants sp ON sp."scheduleId" = s.id
      WHERE s."notificationDateTime" IS NOT NULL
        AND s."notificationDateTime" = $1
        AND s."startDate" >= $1
        AND (s."notificationSent" = 0 OR s."notificationSent" IS NULL)
      ORDER BY s."notificationDateTime" ASC, s.id ASC
    `;
    const rows = await dataSource.query(query, [currentTimeStr]);

    console.log(`📋 조회된 알림 대상: ${rows.length}개`);

    // 쿼리 결과를 바로 알림 데이터로 변환
    const allNotifications: Array<{ userId: string; data: SendPushJobData; scheduleTitle: string; scheduleId: string }> = [];

    for (const row of rows) {
      // yyyymmddHH24mmss 형식을 Date로 변환
      const startDate = parseDateFromString(row.start_date);
      const pushData: SendPushJobData = {
        userId: row.user_id,
        title: `📅 일정 알림: ${row.schedule_title}`,
        body: row.memo 
          ? `${row.memo}\n시작: ${startDate.toLocaleString('ko-KR')}`
          : `시작 시간: ${startDate.toLocaleString('ko-KR')}`,
        data: {
          type: 'schedule',
          scheduleId: row.schedule_id,
          roomId: row.room_id,
          timestamp: new Date().toISOString(),
        },
        tag: `schedule-${row.schedule_id}`,
      };

      allNotifications.push({
        userId: row.user_id,
        data: pushData,
        scheduleTitle: row.schedule_title,
        scheduleId: row.schedule_id,
      });
    }

    // 일정별 통계 출력
    const scheduleCounts = new Map<string, number>();
    for (const row of rows) {
      const count = scheduleCounts.get(row.schedule_title) || 0;
      scheduleCounts.set(row.schedule_title, count + 1);
    }

    scheduleCounts.forEach((count, title) => {
      console.log(`📢 일정 알림 준비: "${title}" (참여자 ${count}명)`);
    });

    if (allNotifications.length === 0) {
      console.log('✅ 전송할 알림이 없습니다.');
      return;
    }

    console.log(`\n🚀 총 ${allNotifications.length}개의 알림을 전송합니다. (동시 실행 제한: ${CONCURRENT_LIMIT})`);

    // 동시 실행 제어를 위한 세마포어
    const semaphore = new Semaphore(CONCURRENT_LIMIT);

    // 배치로 알림 전송
    const result = await sendNotificationsBatch(
      pushService,
      allNotifications.map(n => ({ 
        userId: n.userId, 
        data: n.data, 
        scheduleTitle: n.scheduleTitle,
        scheduleId: n.scheduleId 
      })),
      semaphore
    );

    // 알림 전송 성공한 일정들의 notificationSent 1씩 증가
    if (result.successfulScheduleIds.size > 0) {
      const scheduleIds = Array.from(result.successfulScheduleIds);
      await dataSource.query(
        `UPDATE schedules SET "notificationSent" = COALESCE("notificationSent", 0) + 1 WHERE id = ANY($1::uuid[])`,
        [scheduleIds]
      );
      console.log(`📝 알림 전송 횟수 증가: ${scheduleIds.length}개 일정`);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n✅ 배치 작업 완료:`);
    console.log(`   전송 완료: ${result.success}명`);
    if (result.failed > 0) {
      console.log(`   전송 실패: ${result.failed}명`);
    }
    console.log(`   소요 시간: ${duration}초`);
    if (result.success > 0) {
      console.log(`   평균 처리 속도: ${(result.success / parseFloat(duration)).toFixed(2)}개/초`);
    }

  } catch (error) {
    console.error('❌ 배치 프로세스 실행 중 오류:', error);
    if (error instanceof Error) {
      console.error('   스택:', error.stack);
    }
    process.exit(1);
  } finally {
    // 애플리케이션 컨텍스트 종료
    await app.close();
    console.log('🔒 애플리케이션 컨텍스트 종료됨');
  }
}

// 스크립트 실행
batchPushProcess();
