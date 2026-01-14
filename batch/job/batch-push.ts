/**
 * 배치 프로세스: PushService 직접 호출 (수동 실행용)
 * 
 * 사용법:
 *   npm run batch:push
 *   또는: npx ts-node -r tsconfig-paths/register batch/job/batch-push.ts
 *   또는 빌드 후: node dist/batch/job/batch-push.js
 * 
 * 환경변수:
 *   BATCH_USER_ID - 푸시를 보낼 사용자 ID (선택사항, 기본값: 'user-id-here')
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../src/app.module';
import { PushService } from '../../src/push/push.service';
import { SendPushJobData } from '../../src/push/dto/subscribe.dto';

async function batchPushProcess() {
  // NestJS 애플리케이션 컨텍스트 초기화
  // 주의: HTTP 서버를 시작하지 않기 위해 logger를 false로 설정
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    // PushService 인스턴스 가져오기
    const pushService = app.get(PushService);

    // 특정 사용자에게 푸시 알림 전송
    const userId = process.env.BATCH_USER_ID || 'user-id-here';
    const pushData: SendPushJobData = {
      userId, // 환경변수 BATCH_USER_ID 또는 기본값 사용
      title: '📢 배치 알림',
      body: '배치 프로세스에서 전송된 알림입니다.',
      data: {
        type: 'batch',
        timestamp: new Date().toISOString(),
      },
      tag: `batch-${Date.now()}`,
    };

    console.log('🚀 푸시 알림 전송 시작...');
    const result = await pushService.sendPushNotification(pushData);
    console.log('✅ 푸시 알림 전송 완료:', result);

    // 또는 여러 사용자에게 전송
    // const userIds = ['user1', 'user2', 'user3'];
    // for (const userId of userIds) {
    //   await pushService.sendPushNotification({
    //     userId,
    //     title: '배치 알림',
    //     body: '알림 내용',
    //   });
    // }

  } catch (error) {
    console.error('❌ 배치 프로세스 실행 중 오류:', error);
    process.exit(1);
  } finally {
    // 애플리케이션 컨텍스트 종료
    await app.close();
    console.log('🔒 애플리케이션 컨텍스트 종료됨');
  }
}

// 스크립트 실행
batchPushProcess();

