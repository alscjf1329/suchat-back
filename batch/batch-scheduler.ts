/**
 * 배치 스케줄러 메인 프로세스
 * 
 * 사용법:
 *   npm run batch:scheduler
 *   또는: npx ts-node -r tsconfig-paths/register batch/batch-scheduler.ts
 * 
 * 설정 방법:
 *   1. 환경변수: BATCH_CONFIG_PATH=./batch/batch.config.json
 *   2. 환경변수: BATCH_SCHEDULES='[{"name":"test","cron":"0 9 * * *","enabled":true}]'
 *   3. 설정 파일: batch/batch.config.json (기본값)
 * 
 * 이 프로세스는 백그라운드에서 계속 실행되며, 설정된 스케줄에 따라
 * 설정 파일의 job 필드에 지정된 shell 명령어를 실행합니다.
 */

import { loadBatchConfig, BatchConfig, ScheduleConfig } from './batch.config';
import * as cron from 'node-cron';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class BatchScheduler {
  private isShuttingDown = false;
  private config: BatchConfig;
  private cronJobs: cron.ScheduledTask[] = [];

  constructor() {
    // 설정 로드
    this.config = loadBatchConfig();
  }

  /**
   * Shell 명령어 실행
   */
  async executeJobCommand(command: string): Promise<void> {
    console.log(`📅 [${new Date().toISOString()}] 배치 작업 실행 시작`);
    console.log(`🔧 실행 명령: ${command}`);

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: process.cwd(),
        maxBuffer: 10 * 1024 * 1024, // 10MB
      });

      if (stdout) {
        console.log('📤 출력:', stdout);
      }
      if (stderr) {
        console.warn('⚠️  경고:', stderr);
      }

      console.log(`✅ 배치 작업 실행 완료`);
    } catch (error: any) {
      console.error('❌ 배치 작업 실행 중 오류:', error.message);
      if (error.stdout) {
        console.error('출력:', error.stdout);
      }
      if (error.stderr) {
        console.error('에러:', error.stderr);
      }
      // 오류 발생 시에도 다음 스케줄은 계속 실행되도록 함
    }

    console.log(`📅 [${new Date().toISOString()}] 배치 작업 실행 완료\n`);
  }

  /**
   * 스케줄러 시작
   */
  startScheduler() {
    console.log('⏰ 스케줄러 시작...\n');

    const enabledSchedules = this.config.schedules.filter(s => s.enabled);
    
    if (enabledSchedules.length === 0) {
      console.warn('⚠️  활성화된 스케줄이 없습니다.');
      return;
    }

    // 설정 파일/환경변수에서 읽은 스케줄 등록
    enabledSchedules.forEach((schedule: ScheduleConfig) => {
      try {
        if (!schedule.job) {
          console.warn(`⚠️  스케줄 [${schedule.name}]에 job 명령어가 없습니다. 스킵합니다.`);
          return;
        }

        const job = cron.schedule(schedule.cron, () => {
          console.log(`📌 [스케줄 실행] ${schedule.name}${schedule.description ? ` - ${schedule.description}` : ''}`);
          this.executeJobCommand(schedule.job!);
        });

        this.cronJobs.push(job);
        console.log(`✅ 스케줄 등록: ${schedule.name} (${schedule.cron})${schedule.description ? ` - ${schedule.description}` : ''}`);
        console.log(`   Job: ${schedule.job}`);
      } catch (error) {
        console.error(`❌ 스케줄 등록 실패 [${schedule.name}]:`, error);
        console.error(`   Cron 표현식 확인 필요: ${schedule.cron}`);
      }
    });

    console.log(`\n✅ 스케줄러가 시작되었습니다. (${enabledSchedules.length}개 스케줄 활성화)`);
    console.log('⏳ 프로세스를 종료하려면 Ctrl+C를 누르세요.\n');
  }

  /**
   * Graceful shutdown 처리
   */
  async shutdown() {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    console.log('\n🛑 배치 스케줄러 종료 중...');

    try {
      // 등록된 cron 작업 중지
      this.cronJobs.forEach(job => {
        job.stop();
      });
      console.log(`✅ ${this.cronJobs.length}개 스케줄 작업 중지됨`);

      process.exit(0);
    } catch (error) {
      console.error('❌ 종료 중 오류:', error);
      process.exit(1);
    }
  }
}

// 메인 실행 함수
async function main() {
  const scheduler = new BatchScheduler();

  // 스케줄러 시작
  scheduler.startScheduler();

  // 프로세스 종료 시그널 처리
  process.on('SIGINT', async () => {
    console.log('\n⚠️  SIGINT 신호 수신');
    await scheduler.shutdown();
  });

  process.on('SIGTERM', async () => {
    console.log('\n⚠️  SIGTERM 신호 수신');
    await scheduler.shutdown();
  });

  // 처리되지 않은 오류 처리
  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ 처리되지 않은 Promise 거부:', reason);
  });

  process.on('uncaughtException', (error) => {
    console.error('❌ 처리되지 않은 예외:', error);
    scheduler.shutdown();
  });
}

// 스크립트 실행
main().catch((error) => {
  console.error('❌ 메인 함수 실행 중 오류:', error);
  process.exit(1);
});

