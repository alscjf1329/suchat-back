/**
 * 배치 스케줄러 설정 타입 정의
 */

export interface ScheduleConfig {
  name: string;
  cron: string;
  enabled: boolean;
  description?: string;
  job?: string; // 실행할 shell 명령어
}

export interface BatchConfig {
  schedules: ScheduleConfig[];
  batch?: {
    defaultTitle?: string;
    defaultBody?: string;
  };
}

/**
 * 배치 설정 로드 (환경변수 또는 설정 파일)
 */
export function loadBatchConfig(): BatchConfig {
  // 환경변수로 설정 파일 경로 지정 가능
  const configPath = process.env.BATCH_CONFIG_PATH || './batch/batch.config.json';
  const fs = require('fs');
  const path = require('path');

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
    } else {
      console.warn(`⚠️  설정 파일을 찾을 수 없습니다: ${fullConfigPath}`);
      console.warn('⚠️  기본 설정을 사용합니다. (환경변수 BATCH_SCHEDULES 또는 batch.config.json 파일을 사용하세요)');
      
      // 기본 스케줄 (fallback)
      config.schedules = [
        {
          name: 'default-morning',
          cron: '0 9 * * *',
          enabled: true,
          description: '매일 오전 9시',
        },
        {
          name: 'default-evening',
          cron: '0 18 * * *',
          enabled: true,
          description: '매일 오후 6시',
        },
      ];
    }
  } catch (error) {
    console.error('❌ 설정 파일 로드 중 오류:', error);
    throw error;
  }

  return config;
}

