/**
 * 배치 스케줄러 메인 프로세스
 * 
 * 사용법:
 *   npm run batch:scheduler
 *   또는: pnpm exec ts-node -r tsconfig-paths/register batch/batch-scheduler.ts
 * 
 * 설정 방법:
 *   1. 환경변수: BATCH_CONFIG_PATH=./batch/batch.config.json
 *   2. 환경변수: BATCH_SCHEDULES='[{"name":"test","cron":"0 9 * * *","enabled":true,"job":"..."}]'
 *   3. 설정 파일: batch/batch.config.json (기본값)
 * 
 * 이 프로세스는 백그라운드에서 계속 실행되며, 설정된 스케줄에 따라
 * 설정 파일의 job 필드에 지정된 shell 명령어를 실행합니다.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as cron from 'node-cron';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// 타입 정의
interface ScheduleConfig {
  name: string;
  cron: string;
  enabled: boolean;
  description?: string;
  job?: string; // 실행할 shell 명령어
  timeout?: number; // 타임아웃 (밀리초, 기본값: 5분)
  maxConcurrent?: number; // 최대 동시 실행 수 (기본값: 1)
}

interface BatchConfig {
  schedules: ScheduleConfig[];
  batch?: {
    defaultTitle?: string;
    defaultBody?: string;
  };
}

// 실행 중인 작업 추적
interface RunningJob {
  scheduleName: string;
  startTime: Date;
  process: any;
}

/**
 * 배치 설정 로드 (환경변수 또는 설정 파일)
 */
function loadBatchConfig(): BatchConfig {
  // 환경변수로 설정 파일 경로 지정 가능
  const configPath = process.env.BATCH_CONFIG_PATH || './batch/batch.config.json';

  let config: BatchConfig = {
    schedules: [],
  };

  // 1. 환경변수에서 직접 스케줄 읽기 (BATCH_SCHEDULES)
  const envSchedules = process.env.BATCH_SCHEDULES;
  if (envSchedules) {
    try {
      const schedules = JSON.parse(envSchedules);
      config.schedules = schedules;
      console.log('✅ 환경변수에서 스케줄 설정을 로드했습니다.');
      return config;
    } catch (error) {
      console.warn('⚠️  환경변수 BATCH_SCHEDULES 파싱 실패, 설정 파일을 시도합니다.');
    }
  }

  // 2. 설정 파일에서 읽기
  const fullConfigPath = path.isAbsolute(configPath)
    ? configPath
    : path.join(process.cwd(), configPath);

  try {
    if (fs.existsSync(fullConfigPath)) {
      const configContent = fs.readFileSync(fullConfigPath, 'utf-8');
      config = JSON.parse(configContent);
      console.log(`✅ 설정 파일에서 스케줄 설정을 로드했습니다: ${fullConfigPath}`);
    }
  } catch (error) {
    console.error('❌ 설정 파일 로드 중 오류:', error);
    throw error;
  }

  return config;
}

class BatchScheduler {
  private isShuttingDown = false;
  private config: BatchConfig;
  private cronJobs: cron.ScheduledTask[] = [];
  private runningJobs: Map<string, RunningJob[]> = new Map(); // 스케줄별 실행 중인 작업 추적

  constructor() {
    // 설정 로드
    this.config = loadBatchConfig();
  }

  /**
   * Shell 명령어 실행 (최적화: 타임아웃, 중복 실행 방지)
   */
  async executeJobCommand(schedule: ScheduleConfig): Promise<void> {
    const scheduleName = schedule.name;
    const maxConcurrent = schedule.maxConcurrent || 1;
    const timeout = schedule.timeout || 5 * 60 * 1000; // 기본 5분

    // 동시 실행 제한 확인
    const running = this.runningJobs.get(scheduleName) || [];
    if (running.length >= maxConcurrent) {
      console.warn(`⚠️  [${scheduleName}] 최대 동시 실행 수(${maxConcurrent})에 도달했습니다. 스킵합니다.`);
      return;
    }

    const startTime = new Date();
    const jobInfo: RunningJob = {
      scheduleName,
      startTime,
      process: null,
    };

    // 실행 중인 작업 목록에 추가
    if (!this.runningJobs.has(scheduleName)) {
      this.runningJobs.set(scheduleName, []);
    }
    this.runningJobs.get(scheduleName)!.push(jobInfo);

    console.log(`📅 [${startTime.toISOString()}] 배치 작업 실행 시작: ${scheduleName}`);
    console.log(`🔧 실행 명령: ${schedule.job}`);

    try {
      // 타임아웃이 있는 exec
      const execPromise = execAsync(schedule.job!, {
        cwd: process.cwd(),
        maxBuffer: 10 * 1024 * 1024, // 10MB
      });

      // 타임아웃 설정
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`작업이 타임아웃되었습니다 (${timeout}ms)`));
        }, timeout);
      });

      const { stdout, stderr } = await Promise.race([execPromise, timeoutPromise]) as any;

      if (stdout) {
        console.log('📤 출력:', stdout);
      }
      if (stderr) {
        console.warn('⚠️  경고:', stderr);
      }

      const duration = ((Date.now() - startTime.getTime()) / 1000).toFixed(2);
      console.log(`✅ 배치 작업 실행 완료 (소요 시간: ${duration}초)`);
    } catch (error: any) {
      const duration = ((Date.now() - startTime.getTime()) / 1000).toFixed(2);
      console.error(`❌ 배치 작업 실행 중 오류 (소요 시간: ${duration}초):`, error.message);
      if (error.stdout) {
        console.error('출력:', error.stdout);
      }
      if (error.stderr) {
        console.error('에러:', error.stderr);
      }
      // 오류 발생 시에도 다음 스케줄은 계속 실행되도록 함
    } finally {
      // 실행 중인 작업 목록에서 제거
      const running = this.runningJobs.get(scheduleName) || [];
      const index = running.findIndex(job => job.startTime === startTime);
      if (index !== -1) {
        running.splice(index, 1);
      }
      if (running.length === 0) {
        this.runningJobs.delete(scheduleName);
      }
    }

    console.log(`📅 [${new Date().toISOString()}] 배치 작업 종료: ${scheduleName}\n`);
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
          this.executeJobCommand(schedule);
        });

        this.cronJobs.push(job);
        console.log(`✅ 스케줄 등록: ${schedule.name} (${schedule.cron})${schedule.description ? ` - ${schedule.description}` : ''}`);
        console.log(`   Job: ${schedule.job}`);
        if (schedule.timeout) {
          console.log(`   타임아웃: ${schedule.timeout / 1000}초`);
        }
        if (schedule.maxConcurrent) {
          console.log(`   최대 동시 실행: ${schedule.maxConcurrent}`);
        }
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
      // 실행 중인 작업 확인
      let runningCount = 0;
      this.runningJobs.forEach((jobs) => {
        runningCount += jobs.length;
      });

      if (runningCount > 0) {
        console.log(`⏳ 실행 중인 작업 ${runningCount}개가 완료될 때까지 대기 중...`);
        // 최대 30초 대기
        const maxWaitTime = 30000;
        const startWait = Date.now();
        
        while (runningCount > 0 && (Date.now() - startWait) < maxWaitTime) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          runningCount = 0;
          this.runningJobs.forEach((jobs) => {
            runningCount += jobs.length;
          });
        }

        if (runningCount > 0) {
          console.warn(`⚠️  ${runningCount}개의 작업이 아직 실행 중입니다. 강제 종료합니다.`);
        }
      }

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
