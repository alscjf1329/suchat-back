# SuChat Backend 개발 가이드

## 📋 프로젝트 개요

SuChat Backend는 NestJS 기반의 실시간 채팅 서버입니다. TypeScript, PostgreSQL, Redis, Socket.IO를 활용하여 확장 가능하고 안정적인 백엔드 아키텍처를 제공합니다.

## 🏗️ 프로젝트 구조

```
src/
├── main.ts                    # 애플리케이션 진입점
├── app.module.ts              # 메인 애플리케이션 모듈
├── chat/                      # 채팅 관련 모듈
│   ├── chat.gateway.ts        # WebSocket 게이트웨이
│   ├── chat.service.ts        # 채팅 비즈니스 로직
│   ├── entities/              # 데이터베이스 엔티티
│   │   ├── chat-room.entity.ts
│   │   ├── message.entity.ts
│   │   └── index.ts
│   └── repositories/          # 데이터 접근 계층
│       ├── postgres-chat.repository.ts
│       └── memory-chat.repository.ts
├── file/                      # 파일 처리 모듈
│   ├── file.controller.ts     # 파일 업로드 API
│   ├── file.service.ts        # 파일 처리 서비스
│   └── file.processor.ts      # 비동기 파일 처리
├── config/                    # 설정 파일들
│   ├── app.config.ts         # 애플리케이션 설정
│   ├── database.config.ts    # 데이터베이스 설정
│   └── redis.config.ts       # Redis 설정
└── queues/                    # Bull Queue 설정
    └── bull.config.ts        # Redis 연결 설정
```

## 💡 개발 팁 & 베스트 프랙티스

### 1. NestJS 모듈 설계 원칙

#### ✅ 좋은 예시
```typescript
// 명확한 책임 분리와 의존성 주입
@Module({
  imports: [
    TypeOrmModule.forFeature([ChatRoom, Message]),
    BullModule.registerQueue({ name: 'file-processing' }),
  ],
  providers: [
    ChatService,
    FileProcessor,
    {
      provide: 'CHAT_REPOSITORY',
      useClass: process.env.USE_MEMORY_DB === 'true' 
        ? MemoryChatRepository 
        : PostgresChatRepository,
    },
  ],
  exports: [ChatService],
})
export class ChatModule {}
```

#### ❌ 피해야 할 것
```typescript
// 모든 것을 하나의 모듈에 몰아넣기
@Module({
  providers: [ChatService, FileService, DatabaseService, RedisService, ...],
  controllers: [ChatController, FileController, UserController, ...],
})
export class AppModule {}
```

### 2. WebSocket 게이트웨이 패턴

#### 이벤트 기반 아키텍처
```typescript
@WebSocketGateway({
  cors: { origin: '*' },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @MessageBody() data: { roomId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    // 비즈니스 로직은 서비스에 위임
    const result = await this.chatService.joinRoom(data.roomId, data.userId);
    
    // 소켓 이벤트 브로드캐스트
    this.server.to(data.roomId).emit('user_joined', {
      userId: data.userId,
      timestamp: new Date(),
    });
    
    return result;
  }
}
```

#### 에러 처리 패턴
```typescript
@SubscribeMessage('send_message')
async handleMessage(@MessageBody() data: MessageDto) {
  try {
    const message = await this.chatService.sendMessage(data);
    this.server.to(data.roomId).emit('new_message', message);
    return message;
  } catch (error) {
    // 클라이언트에게 에러 전송
    throw new WsException({
      event: 'error',
      message: '메시지 전송에 실패했습니다.',
      code: 'MESSAGE_SEND_FAILED',
    });
  }
}
```

### 3. 데이터베이스 설계 패턴

#### 엔티티 설계
```typescript
@Entity('chat_rooms')
export class ChatRoom {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', array: true, default: '{}' })
  participants: string[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => Message, message => message.room)
  messages: Message[];
}
```

#### Repository 패턴
```typescript
export interface IChatRepository {
  createRoom(name: string, description?: string): Promise<ChatRoom>;
  getRoom(roomId: string): Promise<ChatRoom | null>;
  joinRoom(roomId: string, userId: string): Promise<boolean>;
  leaveRoom(roomId: string, userId: string): Promise<boolean>;
  getRoomMessages(roomId: string): Promise<Message[]>;
}

@Injectable()
export class PostgresChatRepository implements IChatRepository {
  constructor(
    @InjectRepository(ChatRoom)
    private chatRoomRepository: Repository<ChatRoom>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
  ) {}

  async createRoom(name: string, description?: string): Promise<ChatRoom> {
    const room = this.chatRoomRepository.create({ name, description });
    return await this.chatRoomRepository.save(room);
  }
}
```

### 4. 비동기 작업 처리 (Bull Queue)

#### 파일 처리 워크플로우
```typescript
@Processor('file-processing')
export class FileProcessor {
  @Process('process-file')
  async handleFileProcessing(job: Job<FileUploadJob>) {
    const { fileId, tempPath, mimeType } = job.data;
    
    try {
      await job.progress(10);
      
      // 파일 타입별 처리
      const fileType = this.getFileType(mimeType);
      const finalPath = await this.processFile(tempPath, fileType, fileId);
      
      await job.progress(70);
      
      // 썸네일 생성 (이미지인 경우)
      let thumbnailPath: string | undefined;
      if (fileType === 'images') {
        thumbnailPath = await this.generateThumbnail(finalPath, fileId);
      }
      
      await job.progress(100);
      
      return {
        fileId,
        finalPath,
        thumbnailPath,
        processedAt: new Date(),
      };
    } catch (error) {
      console.error('File processing error:', error);
      throw error;
    }
  }
}
```

#### 큐 작업 상태 관리
```typescript
@Injectable()
export class FileService {
  constructor(
    @InjectQueue('file-processing') private fileQueue: Queue,
  ) {}

  async processFile(fileData: FileUploadJob): Promise<{ jobId: string }> {
    const job = await this.fileQueue.add('process-file', fileData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });

    return { jobId: job.id };
  }

  async getFileStatus(jobId: string) {
    const job = await this.fileQueue.getJob(jobId);
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return {
      id: job.id,
      progress: job.progress(),
      state: await job.getState(),
      data: job.data,
      result: job.returnvalue,
    };
  }
}
```

### 5. 설정 관리 패턴

#### 환경별 설정 분리
```typescript
// config/app.config.ts
export default registerAs('app', () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  uploadPath: process.env.UPLOAD_PATH || './uploads',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600', 10),
}));

// config/database.config.ts
export default registerAs('database', () => ({
  type: 'postgres' as const,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'suchat',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development',
}));
```

#### 설정 사용법
```typescript
@Injectable()
export class ChatService {
  constructor(
    @Inject('CHAT_REPOSITORY') private chatRepository: IChatRepository,
    private configService: ConfigService,
  ) {}

  async createRoom(name: string, description?: string) {
    const maxRooms = this.configService.get<number>('app.maxRoomsPerUser');
    // 설정값 활용
  }
}
```

### 6. 파일 업로드 및 처리

#### Multer 설정
```typescript
@Post('upload')
@UseInterceptors(
  FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/temp',
      filename: (req, file, cb) => {
        const randomName = Array(32)
          .fill(null)
          .map(() => Math.round(Math.random() * 16).toString(16))
          .join('');
        cb(null, `${randomName}${extname(file.originalname)}`);
      },
    }),
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB
    },
    fileFilter: (req, file, cb) => {
      const allowedMimes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/webm',
        'application/pdf', 'application/msword',
      ];
      
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new BadRequestException('File type not allowed'), false);
      }
    },
  }),
)
async uploadFile(@UploadedFile() file: Express.Multer.File) {
  // 파일 업로드 처리
}
```

#### Sharp를 활용한 이미지 처리
```typescript
private async processImage(inputPath: string, outputPath: string) {
  await sharp(inputPath)
    .resize(1920, 1080, { 
      fit: 'inside',
      withoutEnlargement: true 
    })
    .jpeg({ quality: 85 })
    .toFile(outputPath);
}

private async generateThumbnail(imagePath: string, fileId: string): Promise<string> {
  const thumbnailDir = path.join('./uploads', 'thumbnails');
  const thumbnailPath = path.join(thumbnailDir, `${fileId}_thumb.jpg`);
  
  await sharp(imagePath)
    .resize(300, 300, { fit: 'cover' })
    .jpeg({ quality: 80 })
    .toFile(thumbnailPath);
  
  return `/thumbnails/${fileId}_thumb.jpg`;
}
```

### 7. 에러 처리 및 로깅

#### 전역 예외 필터
```typescript
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status = exception instanceof HttpException 
      ? exception.getStatus() 
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? exception.getResponse()
      : 'Internal server error';

    console.error(`[${request.method}] ${request.url}`, exception);

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}
```

#### 커스텀 예외 클래스
```typescript
export class ChatRoomNotFoundException extends HttpException {
  constructor(roomId: string) {
    super(
      `채팅방을 찾을 수 없습니다: ${roomId}`,
      HttpStatus.NOT_FOUND,
    );
  }
}

export class UserNotInRoomException extends HttpException {
  constructor(userId: string, roomId: string) {
    super(
      `사용자 ${userId}가 채팅방 ${roomId}에 참여하지 않았습니다`,
      HttpStatus.FORBIDDEN,
    );
  }
}
```

### 8. 테스트 작성 패턴

#### 단위 테스트
```typescript
describe('ChatService', () => {
  let service: ChatService;
  let mockRepository: jest.Mocked<IChatRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: 'CHAT_REPOSITORY',
          useValue: {
            createRoom: jest.fn(),
            getRoom: jest.fn(),
            joinRoom: jest.fn(),
            leaveRoom: jest.fn(),
            getRoomMessages: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    mockRepository = module.get('CHAT_REPOSITORY');
  });

  it('should create a room', async () => {
    const roomData = { name: 'Test Room', description: 'Test Description' };
    const expectedRoom = { id: '1', ...roomData };
    
    mockRepository.createRoom.mockResolvedValue(expectedRoom);

    const result = await service.createRoom(roomData.name, roomData.description);

    expect(result).toEqual(expectedRoom);
    expect(mockRepository.createRoom).toHaveBeenCalledWith(
      roomData.name,
      roomData.description,
    );
  });
});
```

#### 통합 테스트
```typescript
describe('ChatController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/chat/rooms (POST)', () => {
    return request(app.getHttpServer())
      .post('/chat/rooms')
      .send({ name: 'Test Room', description: 'Test Description' })
      .expect(201)
      .expect((res) => {
        expect(res.body.name).toBe('Test Room');
        expect(res.body.id).toBeDefined();
      });
  });
});
```

## 🛠️ 개발 도구 & 설정

### 1. TypeScript 설정
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

### 2. ESLint 설정
```javascript
// eslint.config.mjs
export default [
  {
    rules: {
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
];
```

### 3. Docker 개발 환경
```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: suchat
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres123
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
```

### 4. 관리 도구 접속 정보

#### 📊 PostgreSQL 데이터베이스 연결 정보
```
호스트: localhost
포트: 5432
데이터베이스명: suchat
사용자명: postgres
비밀번호: postgres123
```

#### 🌐 웹 기반 관리 도구

**pgAdmin (PostgreSQL 관리 도구):**
```
URL: http://localhost:8080
이메일: admin@suchat.com
비밀번호: admin123
```

**Redis Commander (Redis 관리 도구):**
```
URL: http://localhost:8081
```

#### 🔧 DBeaver 연결 설정
1. **새 연결 생성** → **PostgreSQL 선택**
2. **연결 정보 입력:**
   - Host: `localhost`
   - Port: `5432`
   - Database: `suchat`
   - Username: `postgres`
   - Password: `postgres123`

#### 🔄 데이터베이스 초기화

**초기화 스크립트**: `bin/query/init.sql`

**실행 방법 (pgAdmin):**
```
1. http://localhost:8080 접속 (admin@suchat.com / admin123)
2. suchat 데이터베이스 선택
3. Tools → Query Tool
4. bin/query/init.sql 내용 복사 후 실행
```

**포함 내용:**
- ✅ 모든 테이블 생성 (users, chat_rooms, messages 등)
- ✅ 최적화 인덱스 13개
- ✅ 트리거 설정 (updatedAt 자동 업데이트)
- ✅ 테스트 사용자 10명 (kim@example.com / password123)

**특징:**
- 멱등성 보장 (`IF NOT EXISTS`)
- 여러 번 실행해도 안전
- 기존 데이터 보존

#### 📋 현재 데이터베이스 스키마 (v1.1.0 - 최적화 완료)

**스키마**: `public`

##### 🗂️ 테이블 목록 (4개 + 1개 조인 테이블)

###### 1. **users** - 사용자 정보
```sql
- id (UUID, PK)
- name (VARCHAR(100))
- email (VARCHAR(255), UNIQUE)
- password (VARCHAR(255))          -- bcrypt 해시
- phone (VARCHAR(20))
- birthday (DATE)
- isActive (BOOLEAN)
- lastLoginAt (TIMESTAMP)
- createdAt (TIMESTAMP)
- updatedAt (TIMESTAMP)

관계: OneToMany → messages
```

###### 2. **email_verifications** - 이메일 인증
```sql
- id (UUID, PK)
- email (VARCHAR(255))
- token (VARCHAR(255))
- type (VARCHAR(50))               -- 'signup' | 'password-reset'
- expiresAt (TIMESTAMP)
- isVerified (BOOLEAN)
- userData (JSONB)                 -- 임시 사용자 데이터
- createdAt (TIMESTAMP)
- updatedAt (TIMESTAMP)

용도: 회원가입 이메일 인증 토큰 관리
```

###### 3. **chat_rooms** - 채팅방 (최적화됨 ⭐)
```sql
- id (UUID, PK)
- name (VARCHAR)
- description (VARCHAR)
- participants (TEXT[])            -- 하위 호환용 (곧 제거 예정)
- lastMessageId (UUID)             -- ⭐ 최근 메시지 ID
- lastMessageAt (TIMESTAMP)        -- ⭐ 최근 메시지 시간 (정렬용)
- dmKey (VARCHAR, UNIQUE)          -- ⭐ DM 중복 방지 키
- createdAt (TIMESTAMP)
- updatedAt (TIMESTAMP)

관계: 
- OneToMany → messages
- OneToMany → chat_room_participants

인덱스:
- idx_chat_rooms_last_at (lastMessageAt DESC)
- idx_chat_rooms_dmkey (dmKey) WHERE dmKey IS NOT NULL
```

###### 4. **chat_room_participants** - 채팅방 참여자 (신규 ⭐)
```sql
- roomId (UUID, PK, FK → chat_rooms)
- userId (UUID, PK, FK → users)
- role (ENUM)                      -- 'owner' | 'admin' | 'member'
- lastReadMessageId (UUID)         -- ⭐ 읽음 표시
- muted (BOOLEAN)                  -- ⭐ 알림 음소거
- pinned (BOOLEAN)                 -- ⭐ 상단 고정
- joinedAt (TIMESTAMP)

용도: 참여자 관리, 읽음 처리, 개인 설정
복합 PK: (roomId, userId)

관계:
- ManyToOne → chat_rooms (CASCADE)
- ManyToOne → users (CASCADE)

인덱스:
- PK (roomId, userId)
- idx_crp_user (userId)            -- 사용자별 참여방 조회
- idx_crp_room (roomId)            -- 방별 참여자 조회
- idx_crp_lastread (roomId, lastReadMessageId)  -- 읽음 처리
```

###### 5. **messages** - 채팅 메시지 (최적화됨 ⭐)
```sql
- id (UUID, PK)
- roomId (UUID, FK → chat_rooms)
- userId (UUID, FK → users)
- content (TEXT)
- type (ENUM)                      -- 'text' | 'image' | 'video' | 'file'
- fileUrl (VARCHAR)
- fileName (VARCHAR)
- fileSize (INTEGER)
- timestamp (TIMESTAMP)

관계:
- ManyToOne → chat_rooms
- ManyToOne → users

인덱스 (최적화):
- idx_messages_room_ts_id (roomId, timestamp DESC, id DESC)  ⭐ 키셋 페이지네이션
- idx_messages_user_ts (userId, timestamp DESC)
```

---

##### 🔍 주요 쿼리 패턴

###### 사용자의 채팅방 목록 (최적화)
```sql
SELECT room.* 
FROM chat_rooms room
INNER JOIN chat_room_participants p ON p.roomId = room.id
WHERE p.userId = 'user-uuid'
ORDER BY room.lastMessageAt DESC NULLS LAST;
-- ⚡ 인덱스 사용: idx_crp_user + idx_chat_rooms_last_at
```

###### 채팅방 메시지 (키셋 페이지네이션)
```sql
SELECT * FROM messages
WHERE roomId = 'room-uuid'
  AND (timestamp, id) < ('2025-10-07 15:00:00', 'cursor-uuid')
ORDER BY timestamp DESC, id DESC
LIMIT 50;
-- ⚡ 인덱스 사용: idx_messages_room_ts_id
```

###### 안읽은 메시지 수
```sql
SELECT COUNT(*) 
FROM messages m
WHERE m.roomId = 'room-uuid'
  AND m.id > (
    SELECT lastReadMessageId 
    FROM chat_room_participants 
    WHERE roomId = 'room-uuid' AND userId = 'user-uuid'
  );
-- ⚡ 인덱스 사용: idx_crp_lastread
```

---

##### 📊 성능 통계

| 작업 | 예상 응답 시간 | 인덱스 |
|------|---------------|--------|
| 채팅방 목록 (100개) | < 50ms | idx_crp_user |
| 메시지 조회 (50개) | < 100ms | idx_messages_room_ts_id |
| 안읽은 수 계산 | < 10ms | idx_crp_lastread |
| 참여자 조회 | < 10ms | PK lookup |

---

##### 🔐 보안 고려사항

1. **비밀번호**: bcrypt (salt rounds: 10)
2. **토큰**: UUID v4 (충돌 확률 극히 낮음)
3. **CASCADE**: 사용자/채팅방 삭제 시 자동 정리
4. **UNIQUE 제약**: 이메일, dmKey 중복 방지

---

##### 🚀 확장 계획

**현재 지원 규모:**
- 사용자: 10,000명
- 동시 접속: 1,000명
- 메시지: 100,000건
- 채팅방: 10,000개

**추후 확장 (메시지 100만 건+):**
- [ ] 메시지 파티셔닝 (월 단위)
- [ ] 풀텍스트 검색 (pg_trgm)
- [ ] Redis 캐싱 강화
- [ ] 읽기 전용 복제본

## 🚀 배포 전 체크리스트

### 1. 성능 검사
- [ ] 데이터베이스 쿼리 최적화
- [ ] Redis 캐싱 전략 적용
- [ ] 파일 업로드 크기 제한
- [ ] 메모리 사용량 모니터링
- [ ] WebSocket 연결 수 제한

### 2. 보안 검사
- [ ] CORS 설정 검토
- [ ] 파일 업로드 보안 검증
- [ ] SQL Injection 방지
- [ ] 환경 변수 보안
- [ ] HTTPS 강제 적용

### 3. 에러 처리 검사
- [ ] 전역 예외 필터 적용
- [ ] WebSocket 에러 처리
- [ ] 파일 처리 실패 시나리오
- [ ] 데이터베이스 연결 실패 처리
- [ ] Redis 연결 실패 처리

### 4. 로깅 및 모니터링
- [ ] 구조화된 로깅 적용
- [ ] 에러 추적 시스템 연동
- [ ] 성능 메트릭 수집
- [ ] 알림 시스템 구축

## 📚 추가 학습 자료

### 1. NestJS 관련
- [NestJS 공식 문서](https://docs.nestjs.com/)
- [NestJS Best Practices](https://github.com/nestjs/nest/blob/master/docs/README.md)
- [NestJS TypeScript Starter](https://github.com/nestjs/typescript-starter)

### 2. WebSocket 관련
- [Socket.IO 공식 문서](https://socket.io/docs/)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

### 3. 데이터베이스 관련
- [TypeORM 공식 문서](https://typeorm.io/)
- [PostgreSQL 공식 문서](https://www.postgresql.org/docs/)
- [Redis 공식 문서](https://redis.io/docs/)

### 4. 파일 처리 관련
- [Sharp 공식 문서](https://sharp.pixelplumbing.com/)
- [Multer 공식 문서](https://github.com/expressjs/multer)

## 🤝 코드 리뷰 가이드라인

### 1. 체크 포인트
- [ ] 모듈 구조가 명확한가?
- [ ] 의존성 주입이 올바르게 사용되었는가?
- [ ] 에러 처리가 적절한가?
- [ ] 타입이 올바르게 정의되었는가?
- [ ] 비즈니스 로직이 서비스에 분리되었는가?

### 2. 코멘트 작성법
```typescript
// ❌ 좋지 않은 코멘트
// 채팅방 생성
async createRoom(name: string) {}

// ✅ 좋은 코멘트
// 새로운 채팅방을 생성하고 생성자를 자동으로 참여시킴
// 중복된 방 이름이 있는 경우 기존 방을 반환
async createRoom(name: string, creatorId: string) {}
```

## 🔄 지속적 개선

### 1. 정기적인 리팩토링
- 매주 코드 리뷰 세션
- 월간 아키텍처 검토
- 분기별 성능 최적화

### 2. 모니터링 및 피드백
- API 응답 시간 모니터링
- 에러 로그 분석
- 사용자 피드백 수집

---

이 문서는 SuChat Backend 프로젝트의 개발 과정에서 얻은 경험과 베스트 프랙티스를 정리한 것입니다. 지속적으로 업데이트하여 팀의 개발 역량 향상에 기여하세요! 🚀

