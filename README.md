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

## 🚀 시작하기

### 사전 요구사항

- Node.js 18+ 
- Docker & Docker Compose
- npm 또는 yarn

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp env-example.txt .env
# .env 파일을 편집하여 데이터베이스 및 Redis 설정

# Docker 컨테이너 실행 (PostgreSQL, Redis, 관리 도구)
npm run docker:start

# 개발 서버 실행
npm run start:dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm run start:prod
```

### Docker 명령어

```bash
# 데이터베이스 시작
npm run docker:start

# 데이터베이스 중지
npm run docker:stop

# 데이터베이스 상태 확인
npm run docker:status

# 데이터베이스 초기화
npm run docker:clean
```

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

## 🔧 환경 설정

### 환경 변수

```env
# Database (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=suchat

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Server
PORT=8000
NODE_ENV=development

# JWT Authentication
JWT_SECRET=your_jwt_secret_key_here_minimum_32_characters

# File Upload
MAX_FILE_SIZE=104857600
UPLOAD_PATH=./uploads

# PWA Push Notifications (VAPID)
# 생성 명령: npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_SUBJECT=mailto:admin@suchat.com

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Database Mode (true = 메모리, false = PostgreSQL)
USE_MEMORY_DB=false
```

### 관리 도구 접속

- **pgAdmin**: http://localhost:8080 (admin@suchat.com / admin123)
- **Redis Commander**: http://localhost:8081

## 📡 API 엔드포인트

### 인증 (Auth)
- `POST /auth/signup` - 회원가입
- `POST /auth/signin` - 로그인
- `POST /auth/verify-email` - 이메일 인증
- `POST /auth/resend-verification` - 인증 메일 재발송

### 푸시 알림 (Push)
- `POST /push/subscribe` - 푸시 구독 등록
- `DELETE /push/unsubscribe` - 푸시 구독 해제
- `POST /push/test` - 테스트 알림 전송
- `GET /push/subscriptions` - 내 구독 목록

### 파일 업로드 (File)
- `POST /file/upload` - 파일 업로드 (📱 **아이폰 JPEG/HEIC 지원**)
- `GET /file/status/:jobId` - 파일 처리 상태 확인
- `GET /file/serve/:type/:filename` - 파일 서빙

#### 지원 파일 형식
- **이미지**: JPEG, PNG, GIF, WebP, BMP, TIFF, SVG, **HEIC/HEIF** (아이폰)
- **비디오**: MP4, WebM, **MOV** (아이폰), M4V
- **문서**: PDF, DOC, DOCX

### WebSocket 이벤트
- `join_room` - 채팅방 참여
- `leave_room` - 채팅방 퇴장
- `send_message` - 메시지 전송
- `get_user_rooms` - 내 채팅방 목록
- `create_room` - 채팅방 생성
- `get_user_rooms` - 사용자 채팅방 목록

## 🗄️ 데이터베이스 스키마

**전체 테이블: 8개**

### 주요 테이블
- `users` - 사용자 정보
- `email_verifications` - 이메일 인증
- `refresh_tokens` - JWT 리프레시 토큰
- `chat_rooms` - 채팅방 메타데이터
- `chat_room_participants` - 채팅방 참여자 정보
- `messages` - 채팅 메시지
- `friends` - 친구 관계
- `push_subscriptions` - 푸시 알림 구독 (사용자당 1개)

**상세 스키마**: `DATABASE_SCHEMA.md` 참조

## 🔄 파일 처리 워크플로우

1. **업로드**: 클라이언트가 파일을 `/file/upload`로 전송
2. **임시 저장**: 파일을 `uploads/temp/`에 임시 저장
3. **큐 작업**: Bull Queue에 파일 처리 작업 추가
4. **비동기 처리**: 
   - 이미지: Sharp로 리사이징 및 최적화
   - **📱 HEIC/HEIF → JPEG 자동 변환** (아이폰 이미지 지원)
   - 썸네일 생성 (300x300)
   - 최종 디렉토리로 이동
5. **완료**: 처리된 파일 정보 반환

### 아이폰 이미지 처리 특징
- **HEIC/HEIF 형식 자동 변환**: 아이폰에서 촬영한 HEIC/HEIF 이미지를 JPEG로 자동 변환
- **MIME 타입 유연성**: 잘못된 MIME 타입으로 전송되어도 확장자 기반으로 검증
- **Live Photo 지원**: image/heic-sequence, image/heif-sequence 지원
- **브라우저 호환성**: 모든 브라우저에서 볼 수 있는 JPEG로 변환하여 저장

## 🧪 테스트

```bash
# 단위 테스트
npm run test

# 테스트 감시 모드
npm run test:watch

# 커버리지 테스트
npm run test:cov

# E2E 테스트
npm run test:e2e
```

## 📝 스크립트

- `npm run build` - 프로덕션 빌드
- `npm run start` - 프로덕션 서버 실행
- `npm run start:dev` - 개발 서버 실행 (감시 모드)
- `npm run start:debug` - 디버그 모드 실행
- `npm run lint` - ESLint 검사 및 수정
- `npm run format` - Prettier 포맷팅

## 🐳 Docker 구성

프로젝트는 다음 Docker 서비스들을 포함합니다:

- **PostgreSQL 15**: 메인 데이터베이스
- **Redis 7**: 캐시 및 큐 저장소
- **pgAdmin**: PostgreSQL 관리 도구
- **Redis Commander**: Redis 관리 도구

## 📚 문서

- 📊 **[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)** - 데이터베이스 스키마 상세
- 📱 **[PWA_PUSH_GUIDE.md](PWA_PUSH_GUIDE.md)** - 푸시 알림 구현 가이드
- 🔧 **[MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)** - 마이그레이션 가이드
- 📝 **[API_DOCS.md](API_DOCS.md)** - API 문서
- 🔍 **[bin/query/README.md](bin/query/README.md)** - SQL 쿼리 가이드
- ⚡ **[OPTIMIZATION_SUMMARY.md](OPTIMIZATION_SUMMARY.md)** - 최적화 내역

## 📄 라이선스

UNLICENSED

---

**SuChat Backend** - 확장 가능하고 안정적인 채팅 서버를 제공합니다. 🚀💬

**버전**: 3.0.0  
**최종 업데이트**: 2025-10-11