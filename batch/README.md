# 배치 스케줄러

배치 스케줄러는 설정된 시간에 자동으로 푸시 알림을 전송하는 프로세스입니다.

## 사용 방법

```bash
npm run batch:scheduler
```

## 설정 방법

### 방법 1: JSON 설정 파일 사용 (권장)

`batch/batch.config.json` 파일을 수정하여 스케줄을 설정합니다.

```json
{
  "schedules": [
    {
      "name": "morning-push",
      "cron": "0 9 * * *",
      "enabled": true,
      "description": "매일 오전 9시 푸시 알림"
    },
    {
      "name": "evening-push",
      "cron": "0 18 * * *",
      "enabled": false,
      "description": "매일 오후 6시 푸시 알림"
    }
  ],
  "batch": {
    "defaultTitle": "📢 정기 알림",
    "defaultBody": "배치 스케줄러에서 전송된 알림입니다."
  }
}
```

### 방법 2: 환경변수로 설정 파일 경로 지정

```bash
BATCH_CONFIG_PATH=./batch/custom-config.json npm run batch:scheduler
```

### 방법 3: 환경변수로 직접 스케줄 설정

```bash
BATCH_SCHEDULES='[{"name":"test","cron":"0 9 * * *","enabled":true}]' npm run batch:scheduler
```

### 방법 4: 사용자 ID 환경변수 지정

```bash
BATCH_USER_ID=user-123 npm run batch:scheduler
```

## Cron 표현식 예제

- `0 9 * * *` - 매일 오전 9시
- `0 18 * * *` - 매일 오후 6시
- `0 9 * * 1-5` - 월~금 오전 9시
- `*/5 * * * *` - 5분마다 (테스트용)
- `0 * * * *` - 매 시간 정각
- `0 0 * * 0` - 매주 일요일 자정

## 설정 우선순위

1. 환경변수 `BATCH_SCHEDULES` (최우선)
2. 환경변수 `BATCH_CONFIG_PATH`로 지정한 설정 파일
3. 기본 설정 파일 `batch/batch.config.json`
4. 기본 스케줄 (fallback)

## 프로덕션 환경에서 실행

PM2를 사용하여 실행:

```bash
pm2 start npm --name "batch-scheduler" -- run batch:scheduler
pm2 save
pm2 startup
```

또는 systemd 서비스로 등록하여 실행할 수 있습니다.

