<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

**Suchat Backend** - 텔레그램급 그룹 채팅 앱을 위한 NestJS 백엔드 서버

### 주요 기능
- 🗨️ 실시간 그룹 채팅 (WebSocket 기반)
- 📁 파일 업로드 및 처리 (이미지, 동영상, 문서)
- 🐂 비동기 파일 처리 큐 (BullMQ)
- 📱 PWA 지원
- 🔄 Redis 기반 메시지 브로커
- 💾 로컬 파일 저장소

## Project setup

### 1. 의존성 설치
```bash
$ npm install
```

### 2. 환경 설정
프로젝트 루트에 `.env` 파일을 생성하고 다음 내용을 추가하세요:

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=
DB_DATABASE=suchat

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Server
PORT=3000
NODE_ENV=development

# File Upload
MAX_FILE_SIZE=104857600
UPLOAD_PATH=./uploads
```

### 3. 데이터베이스 서비스 실행

#### 🐳 Docker 사용 (추천)
```bash
# Windows
start-db.bat

# Linux/Mac
./start-db.sh

# 또는 직접 실행
docker-compose up -d
```

#### 📋 서비스 정보
- **PostgreSQL**: `localhost:5432` (postgres/postgres123)
- **Redis**: `localhost:6379`
- **pgAdmin**: `http://localhost:8080` (admin@suchat.com/admin123)
- **Redis Commander**: `http://localhost:8081`

#### 🛠️ 관리 스크립트
- `start-db.bat` / `start-db.sh`: 서비스 시작
- `stop-db.bat`: 서비스 중지
- `clean-db.bat`: 데이터 완전 삭제
- `status-db.bat`: 서비스 상태 확인

### 4. 프로젝트 구조
```
src/
├── chat/           # 채팅 관련 모듈
├── file/           # 파일 업로드 및 처리
├── queues/         # BullMQ 큐 설정
├── config/         # 환경 설정
└── common/         # 공통 유틸리티

uploads/            # 파일 저장소
├── images/         # 이미지 파일
├── videos/         # 동영상 파일
├── docs/           # 문서 파일
├── thumbnails/     # 썸네일
└── temp/           # 임시 파일
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## API 엔드포인트

### WebSocket 이벤트 (Socket.IO)
- `join_room`: 채팅방 참가
- `leave_room`: 채팅방 퇴장
- `send_message`: 메시지 전송
- `create_room`: 채팅방 생성
- `get_user_rooms`: 사용자 채팅방 목록

### HTTP API
- `POST /file/upload`: 파일 업로드
- `GET /file/status/:jobId`: 파일 처리 상태 확인
- `GET /file/serve/:type/:filename`: 파일 서빙

## 사용 예시

### 1. 채팅방 생성 및 참가
```javascript
// Socket.IO 클라이언트
socket.emit('create_room', {
  name: '테스트 채팅방',
  description: '테스트용 채팅방입니다',
  userId: 'user123'
});

socket.emit('join_room', {
  roomId: 'room456',
  userId: 'user123'
});
```

### 2. 메시지 전송
```javascript
socket.emit('send_message', {
  roomId: 'room456',
  userId: 'user123',
  content: '안녕하세요!',
  type: 'text'
});
```

### 3. 파일 업로드
```javascript
// FormData로 파일 업로드
const formData = new FormData();
formData.append('file', file);
formData.append('userId', 'user123');
formData.append('roomId', 'room456');

fetch('/file/upload', {
  method: 'POST',
  body: formData
});
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
