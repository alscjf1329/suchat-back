# SuChat Backend 🚀

NestJS 기반의 실시간 채팅 서버

## 📋 프로젝트 소개

SuChat Backend는 NestJS 프레임워크를 기반으로 구축된 실시간 채팅 애플리케이션의 서버 사이드입니다. WebSocket을 통한 실시간 통신, 파일 업로드 처리, 그리고 PostgreSQL과 Redis를 활용한 확장 가능한 아키텍처를 제공합니다.

## ✨ 주요 기능

- 💬 **실시간 채팅**: Socket.IO를 통한 실시간 메시지 송수신
- 🏠 **채팅방 관리**: 채팅방 생성, 참여, 퇴장 기능
- 📁 **파일 업로드**: 이미지, 비디오, 문서 파일 업로드 및 처리
- 🖼️ **이미지 최적화**: Sharp를 활용한 이미지 리사이징 및 썸네일 생성
- 📱 **아이폰 이미지 지원**: HEIC/HEIF 형식 자동 JPEG 변환
- 🔄 **비동기 처리**: Bull Queue를 통한 파일 처리 작업 관리
- 🗄️ **데이터 저장**: PostgreSQL 데이터베이스와 메모리 DB 지원
- 📊 **관리 도구**: pgAdmin, Redis Commander 포함
- 🔔 **PWA 푸시 알림**: Web Push Protocol 기반 실시간 알림
- 👥 **친구 시스템**: 친구 요청, 수락, 관리
- 🔐 **JWT 인증**: AccessToken/RefreshToken 기반 보안
- ⚡ **성능 최적화**: gzip 압축, 정적 파일 캐싱

## 🛠 기술 스택

- **Backend Framework**: NestJS 11
- **Language**: TypeScript
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **WebSocket**: Socket.IO
- **File Processing**: Sharp, Multer
- **Queue**: Bull Queue
- **ORM**: TypeORM
- **Container**: Docker & Docker Compose
- **Push Notifications**: web-push (Web Push Protocol)
- **Authentication**: JWT (passport-jwt)
- **Compression**: gzip (compression middleware)

---

## 🚀 빠른 시작

### 초기 설치

**상세한 설치 가이드는 [INSTALLATION.md](INSTALLATION.md)를 참조하세요.**

간단한 설치 절차:

```bash
# 1. 의존성 설치
pnpm install

# 2. 환경 변수 설정
cp .env.example .env
# .env 파일 편집 필요

# 3. Docker 컨테이너 실행
cd bin/docker
./start-db.sh

# 4. 데이터베이스 초기화
# pgAdmin에서 bin/query/init.sql 실행

# 5. 개발 서버 실행
pnpm run start:dev
```

### 프로덕션 실행 (PM2)

```bash
# 빌드
pnpm run build

# PM2로 시작
pm2 start dist/main.js --name suchat-backend
```

> 📖 **자세한 내용**: [INSTALLATION.md](INSTALLATION.md) - PM2 설정 및 프로덕션 배포 가이드 참조

---

## 📁 프로젝트 구조

```
src/
├── app.module.ts              # 메인 애플리케이션 모듈
├── main.ts                    # 애플리케이션 진입점
├── auth/                      # 인증 모듈
│   ├── auth.controller.ts     # 인증 API
│   ├── jwt.strategy.ts        # JWT 전략
│   ├── jwt-auth.guard.ts      # JWT Guard
│   └── services/              # 인증 서비스들
│       ├── token.service.ts   # JWT 토큰 관리
│       ├── email.service.ts   # 이메일 발송
│       └── email-verification.service.ts
├── chat/                      # 채팅 관련 모듈
│   ├── chat.gateway.ts        # WebSocket 게이트웨이
│   ├── chat.service.ts        # 채팅 비즈니스 로직
│   ├── entities/              # 데이터베이스 엔티티
│   └── repositories/          # 데이터 접근 계층
├── file/                      # 파일 처리 모듈
│   ├── file.controller.ts     # 파일 업로드 API
│   ├── file.service.ts        # 파일 처리 서비스
│   └── file.processor.ts      # 비동기 파일 처리
├── push/                      # 푸시 알림 모듈
│   ├── push.controller.ts     # 푸시 알림 API
│   ├── push.service.ts        # 푸시 알림 서비스
│   ├── push.processor.ts      # 비동기 푸시 처리
│   └── entities/              # 푸시 구독 엔티티
├── user/                      # 사용자 모듈
│   ├── user.service.ts        # 사용자 관리
│   └── entities/              # 사용자 엔티티
├── config/                    # 설정 파일들
│   ├── app.config.ts          # 애플리케이션 설정
│   ├── database.config.ts     # 데이터베이스 설정
│   ├── redis.config.ts        # Redis 설정
│   └── push.config.ts         # 푸시 알림 설정 (VAPID)
└── queues/                    # Bull Queue 설정
    └── bull.config.ts         # Redis 연결 설정
```

---

## 🔧 환경 변수 상세 설명

### 데이터베이스 설정

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `DB_HOST` | PostgreSQL 호스트 | `localhost` |
| `DB_PORT` | PostgreSQL 포트 | `5432` |
| `DB_USERNAME` | 데이터베이스 사용자명 | `postgres` |
| `DB_PASSWORD` | 데이터베이스 비밀번호 | - |
| `DB_DATABASE` | 데이터베이스 이름 | `suchat` |

### Redis 설정

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `REDIS_HOST` | Redis 호스트 | `localhost` |
| `REDIS_PORT` | Redis 포트 | `6379` |
| `REDIS_PASSWORD` | Redis 비밀번호 (선택) | - |

### 서버 설정

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `PORT` | 서버 포트 | `8000` |
| `NODE_ENV` | 실행 환경 | `development` |

### JWT 인증

| 변수 | 설명 | 예시 |
|------|------|------|
| `JWT_SECRET` | JWT 토큰 서명 키 (최소 32자) | `your_secret_key_here_minimum_32_characters` |

### 파일 업로드

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `MAX_FILE_SIZE` | 최대 파일 크기 (bytes) | `104857600` (100MB) |
| `UPLOAD_PATH` | 업로드 파일 저장 경로 | `./uploads` |

### 이메일 (SMTP)

| 변수 | 설명 | 예시 |
|------|------|------|
| `SMTP_HOST` | SMTP 서버 주소 | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP 포트 | `587` |
| `SMTP_USER` | SMTP 사용자 이메일 | `your_email@gmail.com` |
| `SMTP_PASS` | SMTP 앱 비밀번호 | `your_app_password` |
| `EMAIL_FROM` | 발신자 이메일 | `noreply@suchat.com` |
| `FRONTEND_URL` | 프론트엔드 URL | `http://localhost:3000` |

> ⚠️ **Gmail 사용 시**: 앱 비밀번호를 생성해야 합니다. ([가이드](https://support.google.com/accounts/answer/185833))

### 푸시 알림 (VAPID)

| 변수 | 설명 | 생성 방법 |
|------|------|----------|
| `VAPID_PUBLIC_KEY` | VAPID 공개키 | `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | VAPID 개인키 | `npx web-push generate-vapid-keys` |
| `VAPID_SUBJECT` | VAPID 주제 (이메일 형식) | `mailto:admin@suchat.com` |

---

## 🐳 Docker 명령어

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

## 📡 API 엔드포인트

### 인증 (Auth)

- `POST /auth/signup` - 회원가입 (이메일 인증 필요)
- `POST /auth/signin` - 로그인
- `POST /auth/verify-email` - 이메일 인증
- `POST /auth/resend-verification` - 인증 메일 재발송
- `POST /auth/refresh` - 토큰 갱신
- `POST /auth/logout` - 로그아웃
- `POST /auth/forgot-password` - 비밀번호 재설정 요청
- `POST /auth/reset-password` - 비밀번호 재설정

### 사용자 (User)

- `GET /users` - 모든 사용자 목록
- `GET /users/search?q={query}` - 사용자 검색

### 친구 (Friends)

- `POST /friends/request` - 친구 요청 보내기
- `PUT /friends/:friendId/accept` - 친구 요청 수락
- `PUT /friends/:friendId/reject` - 친구 요청 거절
- `GET /friends` - 친구 목록
- `GET /friends/requests/received` - 받은 친구 요청
- `GET /friends/requests/sent` - 보낸 친구 요청
- `DELETE /friends/:friendId` - 친구 요청 삭제/취소

### 푸시 알림 (Push)

- `POST /push/subscribe` - 푸시 구독 등록 (인증 필요)
- `DELETE /push/unsubscribe` - 푸시 구독 해제 (인증 필요)
- `POST /push/test` - 테스트 알림 전송 (인증 필요)
- `GET /push/subscriptions` - 내 구독 목록 (인증 필요)

### 파일 업로드 (File)

- `POST /file/upload` - 파일 업로드 (📱 **아이폰 JPEG/HEIC 지원**)
- `GET /file/status/:jobId` - 파일 처리 상태 확인
- `GET /file/serve/:type/:filename` - 파일 서빙

#### 지원 파일 형식

- **이미지**: JPEG, PNG, GIF, WebP, BMP, TIFF, SVG, **HEIC/HEIF** (아이폰)
- **비디오**: MP4, WebM, **MOV** (아이폰), M4V
- **문서**: PDF, DOC, DOCX

### 채팅 앨범 (Chat Album)

- `GET /chat/album/:roomId` - 채팅방 사진첩 조회
- `POST /chat/album/:roomId` - 사진첩에 파일 추가
- `DELETE /chat/album/:albumId` - 사진첩에서 파일 삭제
- `GET /chat/album/:roomId/folders` - 폴더 목록 조회
- `POST /chat/album/:roomId/folders` - 폴더 생성
- `GET /chat/album/:roomId/folders/:folderId` - 폴더별 사진 조회
- `DELETE /chat/album/:roomId/folders/:folderId` - 폴더 삭제

### WebSocket 이벤트

- `join_room` - 채팅방 참여
- `leave_room` - 채팅방 퇴장
- `send_message` - 메시지 전송
- `get_user_rooms` - 내 채팅방 목록
- `create_room` - 채팅방 생성

> 📚 **상세 API 문서**: `API_DOCS.md` 참조

---

## 🗄️ 데이터베이스 스키마

### 주요 테이블 (10개)

| 테이블명 | 설명 |
|---------|------|
| `users` | 사용자 정보 |
| `email_verifications` | 이메일 인증 토큰 |
| `refresh_tokens` | JWT 리프레시 토큰 |
| `chat_rooms` | 채팅방 메타데이터 |
| `chat_room_participants` | 채팅방 참여자 정보 |
| `messages` | 채팅 메시지 (실시간 전송용) |
| `room_albums` | 채팅방 사진첩 (추억 정리용) |
| `room_album_folders` | 사진첩 폴더 구조 |
| `friends` | 친구 관계 |
| `push_subscriptions` | 푸시 알림 구독 (사용자당 1개) |

> 📊 **상세 스키마**: `DATABASE_SCHEMA.md` 참조

### 관리 도구 접속 정보

#### pgAdmin (PostgreSQL 관리)
- **URL**: http://localhost:8080
- **이메일**: `admin@suchat.com`
- **비밀번호**: `admin123`

#### Redis Commander (Redis 관리)
- **URL**: http://localhost:8081

#### 직접 연결 정보

**PostgreSQL:**
```
Host: localhost
Port: 5432
Database: suchat
Username: postgres
Password: postgres123
```

**Redis:**
```
Host: localhost
Port: 6379
Password: (없음)
```

---

## 🔔 푸시 알림 설정

### 1. VAPID 키 생성

```bash
npx web-push generate-vapid-keys
```

### 2. 환경 변수 설정

백엔드 `.env`:
```env
VAPID_PUBLIC_KEY=생성된_공개키
VAPID_PRIVATE_KEY=생성된_개인키
VAPID_SUBJECT=mailto:admin@suchat.com
```

프론트엔드 `.env.local`:
```env
NEXT_PUBLIC_VAPID_KEY=생성된_공개키
```

### 3. 데이터베이스 마이그레이션

푸시 구독 테이블이 없으면 다음 마이그레이션 실행:

```bash
# pgAdmin에서 실행하거나
cat bin/query/migrations/003_add_push_subscriptions.sql | docker compose -f bin/docker/docker-compose.yml exec -T postgres psql -U postgres -d suchat
```

> 📱 **상세 가이드**: `PWA_PUSH_GUIDE.md` 참조

---

## 📁 파일 업로드 워크플로우

### 공통 파일 업로드 프로세스

1. **업로드**: 클라이언트가 파일을 `/file/upload`로 전송
2. **임시 저장**: 파일을 `uploads/temp/`에 임시 저장
3. **큐 작업**: Bull Queue에 파일 처리 작업 추가
4. **비동기 처리**: 
   - 이미지: Sharp로 리사이징 및 최적화
   - **📱 HEIC/HEIF → JPEG 자동 변환** (아이폰 이미지 지원)
   - 썸네일 생성 (300x300)
   - 최종 디렉토리로 이동
5. **완료**: 처리된 파일 정보 반환

### 용도별 분기 처리

- **채팅 메시지**: 파일 처리 완료 후 `socketClient.sendMessage()` 호출하여 실시간 전송
- **사진첩**: 파일 처리 완료 후 `/chat/album/:roomId` API 호출하여 사진첩에 저장

### 아이폰 이미지 처리 특징

- **HEIC/HEIF 형식 자동 변환**: 아이폰에서 촬영한 HEIC/HEIF 이미지를 JPEG로 자동 변환
- **MIME 타입 유연성**: 잘못된 MIME 타입으로 전송되어도 확장자 기반으로 검증
- **Live Photo 지원**: image/heic-sequence, image/heif-sequence 지원
- **브라우저 호환성**: 모든 브라우저에서 볼 수 있는 JPEG로 변환하여 저장

---

## 📝 스크립트

```bash
# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm run start:prod

# 개발 서버 실행 (Hot Reload)
npm run start:dev

# 디버그 모드 실행
npm run start:debug

# ESLint 검사 및 수정
npm run lint

# Prettier 포맷팅
npm run format

# 단위 테스트
npm run test

# 테스트 감시 모드
npm run test:watch

# 커버리지 테스트
npm run test:cov

# E2E 테스트
npm run test:e2e
```

---

## 🧪 테스트

### 테스트 사용자

초기화 스크립트 실행 시 다음 테스트 사용자가 생성됩니다:

- **이메일**: `kim@example.com` ~ `lee@example.com` (10명)
- **비밀번호**: `password123` (모두 동일)

### API 테스트

```bash
# 로그인 테스트
curl -X POST http://localhost:8000/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "kim@example.com",
    "password": "password123"
  }'
```

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

### 파일 업로드 실패

**문제**: `File type not allowed` 또는 `File too large`

**해결**:
1. 지원되는 파일 형식 확인 (JPEG, PNG, MP4 등)
2. 파일 크기가 100MB 이하인지 확인
3. `MAX_FILE_SIZE` 환경 변수 확인

### 이메일 발송 실패

**문제**: `Email sending failed`

**해결**:
1. Gmail 사용 시 앱 비밀번호 생성 필요
2. `.env` 파일의 SMTP 설정 확인
3. 방화벽/보안 설정 확인

---

## 🚀 프로덕션 배포

### 빌드

```bash
npm run build
```

### 환경 변수

프로덕션 환경에서는 다음을 설정하세요:

```env
NODE_ENV=production
PORT=8000
DB_HOST=your_production_db_host
REDIS_HOST=your_production_redis_host
JWT_SECRET=your_secure_production_secret
```

### 프로세스 관리

PM2를 사용한 프로세스 관리 예시:

```bash
# PM2 설치
npm install -g pm2

# 애플리케이션 시작
pm2 start dist/main.js --name suchat-backend

# 자동 재시작 설정
pm2 startup
pm2 save
```

---

## 📚 문서

### 설치 및 배포
- 🚀 **[INSTALLATION.md](INSTALLATION.md)** - 초기 설치 가이드 (PM2, DB 설정 포함)
- 📝 **[README.DEV.md](README.DEV.md)** - 개발 가이드 및 베스트 프랙티스

### API 및 스키마
- 📝 **[API_DOCS.md](API_DOCS.md)** - API 문서
- 📊 **[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)** - 데이터베이스 스키마 상세
- 🔍 **[bin/query/README.md](bin/query/README.md)** - SQL 쿼리 가이드

### 기능 가이드
- 📱 **[PWA_PUSH_GUIDE.md](PWA_PUSH_GUIDE.md)** - 푸시 알림 구현 가이드
- 🔧 **[MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)** - 마이그레이션 가이드
- ⚡ **[OPTIMIZATION_SUMMARY.md](OPTIMIZATION_SUMMARY.md)** - 최적화 내역
- 🔧 **[NGINX_UPLOAD_FIX.md](NGINX_UPLOAD_FIX.md)** - Nginx 파일 업로드 설정

---

## 📄 라이선스

UNLICENSED

---

**SuChat Backend** - 확장 가능하고 안정적인 채팅 서버를 제공합니다. 🚀💬

**버전**: 3.0.0  
**최종 업데이트**: 2025-10-11
