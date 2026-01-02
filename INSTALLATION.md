# 🚀 SuChat Backend 초기 설치 가이드

이 문서는 SuChat Backend를 처음 설치하고 실행하기 위한 상세 가이드입니다.

## 📋 목차

0. [자동 설치 스크립트 (권장)](#0-자동-설치-스크립트-권장)
1. [사전 요구사항](#1-사전-요구사항)
2. [프로젝트 클론 및 의존성 설치](#2-프로젝트-클론-및-의존성-설치)
3. [환경 변수 설정](#3-환경-변수-설정)
4. [VAPID 키 생성](#4-vapid-키-생성-푸시-알림용)
5. [Docker 컨테이너 실행](#5-docker-컨테이너-실행-postgresql--redis)
6. [데이터베이스 초기화](#6-데이터베이스-초기화)
7. [개발 서버 실행](#7-개발-서버-실행)
8. [PM2를 사용한 프로덕션 실행](#8-pm2를-사용한-프로덕션-실행)
9. [설치 확인](#9-설치-확인)

---

## 0️⃣ 자동 설치 스크립트 (권장) ⚡

가장 빠르고 간편한 설치 방법입니다. 스크립트가 모든 설정을 자동으로 처리합니다.

### 개발 환경 설치

```bash
# 백엔드 디렉토리에서 실행
cd suchat-back
./bin/install.sh dev
```

**자동으로 수행되는 작업:**
- ✅ 사전 요구사항 확인 (Node.js, pnpm, Docker)
- ✅ 백엔드 의존성 설치
- ✅ JWT_SECRET 자동 생성
- ✅ VAPID 키 자동 생성
- ✅ `.env` 파일 자동 생성
- ✅ 프론트엔드 `.env.local` 파일 자동 생성
- ✅ Docker 컨테이너 실행 (PostgreSQL, Redis, pgAdmin, Redis Commander)
- ✅ 데이터베이스 초기화 (테이블 생성, 테스트 사용자 생성)
- ✅ 프론트엔드 의존성 설치

### 운영 환경 설치

```bash
# 백엔드 디렉토리에서 실행
cd suchat-back
./bin/install.sh op
```

**자동으로 수행되는 작업:**
- ✅ 사전 요구사항 확인
- ✅ 백엔드 의존성 설치
- ✅ 환경 변수 설정 (사용자 입력 받기)
- ✅ 프로덕션 빌드

### 설치 후

**개발 환경:**
```bash
# 터미널 1: 백엔드
cd suchat-back
pnpm run start:dev

# 터미널 2: 프론트엔드
cd suchat-front
pnpm run dev
```

**운영 환경:**
```bash
# PM2로 실행
pm2 start dist/main.js --name suchat-backend
pm2 save
```

> 💡 **팁**: 자동 설치 스크립트를 사용하면 수동 설정이 필요 없습니다. 문제가 발생하면 아래의 수동 설치 가이드를 참조하세요.

---

---

## 1️⃣ 사전 요구사항

다음 도구들이 설치되어 있어야 합니다:

### 필수 도구

- **Node.js 18 이상** ([다운로드](https://nodejs.org/))
- **pnpm** ([설치 방법](https://pnpm.io/installation))
- **Docker & Docker Compose** ([다운로드](https://www.docker.com/products/docker-desktop))
- **Git** ([다운로드](https://git-scm.com/))

### 선택 도구 (프로덕션)

- **PM2** (프로세스 관리)
- **Nginx** (리버스 프록시, SSL)

### 설치 확인

```bash
node --version    # v18.0.0 이상
pnpm --version    # 8.0.0 이상
docker --version  # 20.10.0 이상
docker compose version  # v2.0.0 이상
```

### pnpm 설치

pnpm이 설치되어 있지 않다면:

```bash
# npm을 사용한 설치
npm install -g pnpm

# 또는 공식 설치 스크립트 (권장)
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

---

## 2️⃣ 프로젝트 클론 및 의존성 설치

```bash
# 프로젝트 디렉토리로 이동
cd suchat-back

# 의존성 설치
pnpm install
```

설치가 완료되면 `node_modules` 폴더가 생성됩니다.

---

## 3️⃣ 환경 변수 설정

> ⚠️ **참고**: 자동 설치 스크립트(`./bin/install.sh dev`)를 사용하면 이 단계가 자동으로 수행됩니다.

### 3.1 환경 변수 파일 생성

```bash
# 환경 변수 예시 파일 복사 (있는 경우)
cp .env.example .env

# 또는 수동으로 생성
touch .env
```

### 3.2 필수 환경 변수

`.env` 파일에 다음 항목들이 반드시 설정되어 있어야 합니다:

**필수 설정 항목:**

1. **JWT_SECRET**: JWT 토큰 서명용 비밀키 (최소 32자)
2. **VAPID_PUBLIC_KEY**: 푸시 알림 공개키
3. **VAPID_PRIVATE_KEY**: 푸시 알림 개인키
4. **DB_PASSWORD**: PostgreSQL 비밀번호 (기본값: postgres123)
5. **SMTP 설정**: 이메일 기능 사용 시 (운영 환경 필수)

> 📝 **참고**: `.env.example` 파일이 있다면 참고하세요. 자동 설치 스크립트는 모든 필수 값을 자동으로 생성합니다.

### 3.3 JWT_SECRET 생성

```bash
# 랜덤 문자열 생성 (32자 이상)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 또는 pnpm 사용
pnpm exec node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

생성된 값을 `.env` 파일의 `JWT_SECRET`에 설정하세요.

### 3.4 환경 변수 파일 예시

**개발 환경 (.env):**
```env
NODE_ENV=development
PORT=8000

# 필수 환경 변수
JWT_SECRET=생성된_64자_랜덤_문자열
VAPID_PUBLIC_KEY=생성된_공개키
VAPID_PRIVATE_KEY=생성된_개인키
VAPID_SUBJECT=mailto:admin@suchat.com

# 데이터베이스 설정
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres123
DB_DATABASE=suchat

# Redis 설정
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# 파일 업로드 설정
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=104857600
```

**운영 환경 (.env):**
```env
NODE_ENV=production
PORT=8000

# 필수 환경 변수 (더 강력한 비밀키 사용 권장)
JWT_SECRET=프로덕션용_강력한_비밀키
VAPID_PUBLIC_KEY=생성된_공개키
VAPID_PRIVATE_KEY=생성된_개인키
VAPID_SUBJECT=mailto:admin@yourdomain.com

# 데이터베이스 설정 (실제 프로덕션 값)
DB_HOST=your_production_db_host
DB_PORT=5432
DB_USERNAME=your_db_user
DB_PASSWORD=your_secure_password
DB_DATABASE=suchat

# Redis 설정 (실제 프로덕션 값)
REDIS_HOST=your_production_redis_host
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# 파일 업로드 설정
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=104857600

# 이메일 설정 (운영 환경 필수)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=noreply@yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

### 3.4 Gmail SMTP 설정 (선택)

이메일 기능을 사용하려면 Gmail 앱 비밀번호가 필요합니다:

1. [Google 계정 관리](https://myaccount.google.com/) 접속
2. 보안 → 2단계 인증 활성화
3. 앱 비밀번호 생성
4. 생성된 비밀번호를 `.env`의 `SMTP_PASS`에 설정

---

## 4️⃣ VAPID 키 생성 (푸시 알림용)

> ⚠️ **참고**: 자동 설치 스크립트(`./bin/install.sh dev`)를 사용하면 이 단계가 자동으로 수행됩니다.

푸시 알림 기능을 사용하려면 VAPID 키가 필요합니다:

```bash
# 백엔드 디렉토리에서 실행
pnpm exec web-push generate-vapid-keys

# 또는 npx 사용
npx web-push generate-vapid-keys
```

출력 예시:
```
=======================================

Public Key:
BOped-ONP1podGZyDYfO3ImM4pZwG8dbw6bHBt0EWkkegjbPLWLbuyNsfVYPeP266iej_LJbZdsGT0cZJ4MJv4g

Private Key:
lxK0MjNYdvQzM7ogzLW8_z9UWDJD-JYyC9Orgy0zY90

=======================================
```

생성된 키를 `.env` 파일에 추가하세요:

```env
VAPID_PUBLIC_KEY=BOped-ONP1podGZyDYfO3ImM4pZwG8dbw6bHBt0EWkkegjbPLWLbuyNsfVYPeP266iej_LJbZdsGT0cZJ4MJv4g
VAPID_PRIVATE_KEY=lxK0MjNYdvQzM7ogzLW8_z9UWDJD-JYyC9Orgy0zY90
VAPID_SUBJECT=mailto:admin@suchat.com
```

> ⚠️ **중요**: 
> - `VAPID_PUBLIC_KEY`는 프론트엔드 `.env.local`에도 동일하게 설정해야 합니다.
> - 자동 설치 스크립트는 프론트엔드 설정도 자동으로 처리합니다.

---

## 5️⃣ Docker 컨테이너 실행 (PostgreSQL & Redis)

> ⚠️ **참고**: 자동 설치 스크립트(`./bin/install.sh dev`)를 사용하면 이 단계가 자동으로 수행됩니다.

### 5.1 Docker 컨테이너 시작

```bash
# 방법 1: 자동 설치 스크립트 사용 (권장)
./bin/install.sh dev

# 방법 2: 수동 실행
cd bin/docker
./start-db.sh

# 또는 직접 Docker Compose 실행
docker compose up -d
```

### 5.2 컨테이너 상태 확인

```bash
# Windows (Git Bash)
./status-db.sh

# 또는
docker compose ps
```

다음 서비스들이 실행되어야 합니다:

- **PostgreSQL**: `localhost:5432`
- **Redis**: `localhost:6379`
- **pgAdmin**: http://localhost:8080 (이메일: admin@suchat.com / 비밀번호: admin123)
- **Redis Commander**: http://localhost:8081

### 5.3 Docker 명령어 모음

```bash
# 데이터베이스 시작
cd bin/docker
./start-db.sh
# 또는
docker compose up -d

# 데이터베이스 중지
./stop-db.sh
# 또는
docker compose down

# 데이터베이스 상태 확인
./status-db.sh
# 또는
docker compose ps

# 데이터베이스 초기화 (모든 데이터 삭제)
./clean-db.sh
# 또는
docker compose down -v
```

---

## 6️⃣ 데이터베이스 초기화

> ⚠️ **참고**: 자동 설치 스크립트(`./bin/install.sh dev`)를 사용하면 이 단계가 자동으로 수행됩니다.

> 📌 **중요**: 데이터베이스 초기화는 Docker 컨테이너가 실행된 후에만 가능합니다.

### 6.1 데이터베이스 개요

SuChat은 **PostgreSQL 15**를 메인 데이터베이스로 사용합니다. 다음 테이블들이 생성됩니다:

- **users**: 사용자 정보
- **email_verifications**: 이메일 인증 토큰
- **refresh_tokens**: JWT 리프레시 토큰
- **chat_rooms**: 채팅방 메타데이터
- **chat_room_participants**: 채팅방 참여자 정보
- **messages**: 채팅 메시지
- **room_albums**: 채팅방 사진첩
- **room_album_folders**: 사진첩 폴더 구조
- **friends**: 친구 관계
- **push_subscriptions**: 푸시 알림 구독

### 6.2 pgAdmin 사용 (권장)

#### pgAdmin 접속

1. 브라우저에서 http://localhost:8080 접속
2. 로그인:
   - 이메일: `admin@suchat.com`
   - 비밀번호: `admin123`

#### 서버 연결 설정

1. 우클릭 "Servers" → "Register" → "Server"
2. General 탭:
   - Name: `SuChat PostgreSQL`
3. Connection 탭:
   - Host: `postgres` (Docker 컨테이너 이름)
   - Port: `5432`
   - Database: `suchat`
   - Username: `postgres`
   - Password: `postgres123`
   - "Save password" 체크

#### 초기화 스크립트 실행

1. `suchat` 데이터베이스 선택
2. Tools → Query Tool
3. `bin/query/init.sql` 파일 열기
4. 전체 내용 복사 후 Query Tool에 붙여넣기
5. Execute (F5) 실행

### 6.2 Docker 직접 실행 (명령줄)

```bash
# PowerShell
Get-Content bin/query/init.sql | docker compose -f bin/docker/docker-compose.yml exec -T postgres psql -U postgres -d suchat

# Git Bash
cat bin/query/init.sql | docker compose -f bin/docker/docker-compose.yml exec -T postgres psql -U postgres -d suchat
```

### 6.3 초기화 스크립트 내용

- ✅ 모든 테이블 생성 (users, chat_rooms, messages 등)
- ✅ 최적화 인덱스 13개
- ✅ 트리거 설정 (updatedAt 자동 업데이트)
- ✅ 테스트 사용자 10명 (kim@example.com / password123)

### 6.4 DBeaver 연결 (선택)

DBeaver를 사용하는 경우:

1. **새 연결 생성** → **PostgreSQL 선택**
2. **연결 정보 입력:**
   - Host: `localhost`
   - Port: `5432`
   - Database: `suchat`
   - Username: `postgres`
   - Password: `postgres123`

### 6.5 데이터베이스 연결 확인

초기화가 완료되면 다음 방법으로 확인할 수 있습니다:

#### pgAdmin에서 확인
1. `suchat` 데이터베이스 선택
2. Schemas → public → Tables
3. `users`, `chat_rooms`, `messages` 등의 테이블이 보여야 함

#### 명령줄에서 확인

```bash
# 테스트 사용자 수 확인 (초기화 시 10명 생성됨)
docker compose -f bin/docker/docker-compose.yml exec postgres psql -U postgres -d suchat -c "SELECT COUNT(*) FROM users;"

# 테이블 목록 확인
docker compose -f bin/docker/docker-compose.yml exec postgres psql -U postgres -d suchat -c "\dt"
```

### 6.6 데이터베이스 초기화 스크립트 위치

초기화 스크립트는 다음 위치에 있습니다:
- **파일 경로**: `bin/query/init.sql`
- **내용**: 테이블 생성, 인덱스 생성, 트리거 설정, 테스트 데이터 생성

초기화 후 생성되는 테스트 사용자:
- 이메일: `kim@example.com` ~ `lim@example.com` (10명)
- 비밀번호: `password123` (모두 동일)

---

## 7️⃣ 개발 서버 실행

```bash
# 백엔드 디렉토리로 이동
cd suchat-back

# 개발 서버 실행 (Hot Reload)
pnpm run start:dev
```

서버가 성공적으로 시작되면 다음 메시지가 표시됩니다:

```
[Nest] INFO  [NestApplication] Nest application successfully started
[Nest] INFO  [NestApplication] Application is running on: http://localhost:8000
✅ Web Push initialized with VAPID
```

> 💡 **개발 모드**: 코드 변경 시 자동으로 재시작됩니다.

---

## 8️⃣ PM2를 사용한 프로덕션 실행

### 8.1 PM2 설치

```bash
# 전역 설치 (pnpm 사용)
pnpm add -g pm2

# 또는 npm 사용
npm install -g pm2
```

### 8.2 프로덕션 빌드

```bash
# 빌드 실행
pnpm run build
```

빌드가 완료되면 `dist/` 폴더가 생성됩니다.

### 8.3 PM2로 애플리케이션 시작

```bash
# PM2로 시작
pm2 start dist/main.js --name suchat-backend

# 또는 ecosystem 파일 사용 (권장)
pm2 start ecosystem.config.js
```

### 8.4 PM2 ecosystem 파일 생성

`ecosystem.config.js` 파일 생성:

```javascript
module.exports = {
  apps: [
    {
      name: 'suchat-backend',
      script: './dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 8000,
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    },
  ],
};
```

### 8.5 PM2 명령어

```bash
# 애플리케이션 시작
pm2 start ecosystem.config.js

# 애플리케이션 중지
pm2 stop suchat-backend

# 애플리케이션 재시작
pm2 restart suchat-backend

# 애플리케이션 삭제
pm2 delete suchat-backend

# 상태 확인
pm2 status

# 로그 확인
pm2 logs suchat-backend

# 실시간 로그 모니터링
pm2 logs suchat-backend --lines 50

# 모니터링 대시보드
pm2 monit

# 메모리/CPU 사용량 확인
pm2 list
```

### 8.6 시스템 재시작 시 자동 시작 설정

```bash
# PM2 startup 스크립트 생성
pm2 startup

# 현재 실행 중인 프로세스 저장
pm2 save
```

시스템 재시작 시 PM2가 자동으로 애플리케이션을 시작합니다.

### 8.7 PM2 로그 관리

```bash
# 로그 파일 위치 확인
pm2 logs suchat-backend --lines 0 --nostream

# 로그 정리 (최근 100줄만 유지)
pm2 flush suchat-backend

# 로그 로테이션 설정 (pm2-logrotate 모듈)
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## 9️⃣ 설치 확인

### 9.1 서버 상태 확인

```bash
# 서버 응답 확인
curl http://localhost:8000
```

### 9.2 데이터베이스 연결 확인

pgAdmin에서:
1. `suchat` 데이터베이스 선택
2. Schemas → Tables → `users` 테이블이 생성되어 있어야 함

또는 명령줄에서:
```bash
docker compose -f bin/docker/docker-compose.yml exec postgres psql -U postgres -d suchat -c "SELECT COUNT(*) FROM users;"
```

### 9.3 Redis 연결 확인

```bash
docker compose -f bin/docker/docker-compose.yml exec redis redis-cli ping
# 응답: PONG
```

### 9.4 API 테스트

```bash
# 로그인 테스트
curl -X POST http://localhost:8000/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "kim@example.com",
    "password": "password123"
  }'
```

성공 시 사용자 정보와 토큰이 반환됩니다.

---

## 🔍 트러블슈팅

### 포트 충돌

**문제**: `Port 8000 is already in use`

**해결**:
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:8000 | xargs kill -9
```

### Docker 컨테이너가 시작되지 않음

**문제**: `Cannot connect to Docker daemon`

**해결**:
1. Docker Desktop이 실행 중인지 확인
2. Docker Desktop 재시작
3. `docker compose down -v` 후 다시 시작

### 데이터베이스 연결 실패

**문제**: `Error: connect ECONNREFUSED 127.0.0.1:5432`

**해결**:
1. Docker 컨테이너 실행 확인: `docker compose ps`
2. `.env` 파일의 `DB_HOST`, `DB_PORT` 확인
3. 컨테이너 재시작: `docker compose restart postgres`

### Redis 연결 실패

**문제**: `Error: connect ECONNREFUSED 127.0.0.1:6379`

**해결**:
1. Redis 컨테이너 실행 확인: `docker compose ps`
2. 컨테이너 재시작: `docker compose restart redis`

### VAPID 키 관련 오류

**문제**: `VAPID keys not configured. Push notifications disabled.`

**해결**:
1. `.env` 파일에 VAPID 키가 설정되어 있는지 확인
2. 키 생성: `npx web-push generate-vapid-keys`
3. 서버 재시작

### PM2 프로세스가 시작되지 않음

**문제**: `pm2 start` 후 프로세스가 즉시 종료됨

**해결**:
```bash
# 에러 로그 확인
pm2 logs suchat-backend --err

# 빌드 확인
ls -la dist/main.js

# 수동 실행하여 에러 확인
node dist/main.js
```

---

## 📚 관련 문서

- **[README.md](README.md)** - 프로젝트 개요 및 사용법
- **[API_DOCS.md](API_DOCS.md)** - API 문서
- **[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)** - 데이터베이스 스키마
- **[PWA_PUSH_GUIDE.md](PWA_PUSH_GUIDE.md)** - 푸시 알림 가이드

---

## 🔄 빠른 설치 요약

### 개발 환경 (한 번에 설치)

```bash
cd suchat-back
./bin/install.sh dev
```

이 명령어 하나로 모든 설정이 완료됩니다:
- ✅ 환경 변수 자동 생성 (JWT_SECRET, VAPID 키)
- ✅ Docker 컨테이너 실행
- ✅ 데이터베이스 초기화
- ✅ 프론트엔드 환경 변수 설정

### 운영 환경 설치

```bash
cd suchat-back
./bin/install.sh op
```

설치 후:
```bash
# 빌드 및 실행
pnpm run build
pm2 start dist/main.js --name suchat-backend
```

---

**설치 완료!** 🎉 이제 SuChat Backend를 사용할 수 있습니다.

