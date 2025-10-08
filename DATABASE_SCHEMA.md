# 📊 SuChat 데이터베이스 스키마 명세서

## 📋 목차
1. [users (사용자)](#1-users-사용자)
2. [email_verifications (이메일 인증)](#2-email_verifications-이메일-인증)
3. [chat_rooms (채팅방)](#3-chat_rooms-채팅방)
4. [messages (메시지)](#4-messages-메시지)
5. [관계도](#5-관계도)

---

## 1. users (사용자)

### 📝 설명
사용자 계정 정보를 저장하는 테이블입니다.

### 🗂️ 컬럼 정보

| 컬럼명 | 타입 | 제약조건 | 기본값 | 설명 |
|--------|------|----------|--------|------|
| `id` | UUID | PRIMARY KEY | auto-generated | 사용자 고유 ID |
| `name` | VARCHAR(100) | NOT NULL | - | 사용자 이름 |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE | - | 이메일 주소 |
| `password` | VARCHAR(255) | NOT NULL | - | bcrypt 해시된 비밀번호 |
| `phone` | VARCHAR(20) | NULLABLE | null | 전화번호 |
| `birthday` | DATE | NULLABLE | null | 생년월일 |
| `isActive` | BOOLEAN | NOT NULL | true | 계정 활성화 여부 |
| `lastLoginAt` | TIMESTAMP | NULLABLE | null | 마지막 로그인 시간 |
| `createdAt` | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 생성 시간 |
| `updatedAt` | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 수정 시간 |

### 🔗 관계
- `OneToMany` → **messages** (사용자가 보낸 메시지들)

### 📌 인덱스
- `email` (UNIQUE)

### 💡 비즈니스 로직
- 비밀번호는 bcrypt (salt rounds: 10)로 암호화
- 이메일은 대소문자 구분 없이 유니크
- isActive가 false면 로그인 불가
 
### 📊 예시 데이터
```sql
{
  "id": "e5f3c8a0-1234-4567-89ab-000000000001",
  "name": "김철수",
  "email": "kim@example.com",
  "password": "$2b$10$...",
  "phone": "010-1111-1111",
  "birthday": "1990-01-15",
  "isActive": true,
  "lastLoginAt": "2025-10-07T15:30:00.000Z",
  "createdAt": "2025-10-07T10:00:00.000Z",
  "updatedAt": "2025-10-07T15:30:00.000Z"
}
```

---

## 2. email_verifications (이메일 인증)

### 📝 설명
이메일 인증 토큰과 임시 사용자 데이터를 저장하는 테이블입니다.

### 🗂️ 컬럼 정보

| 컬럼명 | 타입 | 제약조건 | 기본값 | 설명 |
|--------|------|----------|--------|------|
| `id` | UUID | PRIMARY KEY | auto-generated | 인증 요청 고유 ID |
| `email` | VARCHAR(255) | NOT NULL | - | 인증할 이메일 주소 |
| `token` | VARCHAR(255) | NOT NULL | - | 인증 토큰 (UUID) |
| `type` | VARCHAR(50) | NOT NULL | 'signup' | 인증 타입 (signup/password-reset) |
| `expiresAt` | TIMESTAMP | NOT NULL | - | 토큰 만료 시간 |
| `isVerified` | BOOLEAN | NOT NULL | false | 인증 완료 여부 |
| `userData` | JSONB | NULLABLE | null | 임시 사용자 데이터 (회원가입 시) |
| `createdAt` | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 생성 시간 |
| `updatedAt` | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 수정 시간 |

### 🔗 관계
- 독립 테이블 (FK 없음)

### 📌 인덱스
- `email` (검색 최적화)
- `token` (검색 최적화)

### 💡 비즈니스 로직
- 회원가입 시 userData에 사용자 정보 임시 저장
- 이메일 인증 완료 시 users 테이블로 이동
- 토큰은 24시간 후 만료
- 인증 완료 후 해당 레코드는 삭제 또는 보관

### 📊 예시 데이터
```sql
{
  "id": "uuid-here",
  "email": "newuser@example.com",
  "token": "abc-123-def-456",
  "type": "signup",
  "expiresAt": "2025-10-08T10:00:00.000Z",
  "isVerified": false,
  "userData": {
    "name": "홍길동",
    "email": "newuser@example.com",
    "password": "$2b$10$...",
    "phone": "010-1234-5678",
    "birthday": "1995-05-15"
  },
  "createdAt": "2025-10-07T10:00:00.000Z",
  "updatedAt": "2025-10-07T10:00:00.000Z"
}
```

---

## 3. chat_rooms (채팅방)

### 📝 설명
채팅방 정보를 저장하는 테이블입니다.

### 🗂️ 컬럼 정보

| 컬럼명 | 타입 | 제약조건 | 기본값 | 설명 |
|--------|------|----------|--------|------|
| `id` | UUID | PRIMARY KEY | auto-generated | 채팅방 고유 ID |
| `name` | VARCHAR | NOT NULL | - | 채팅방 이름 |
| `description` | VARCHAR | NULLABLE | null | 채팅방 설명 |
| `participants` | TEXT[] | NOT NULL | [] | 참여자 ID 배열 |
| `createdAt` | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 생성 시간 |
| `updatedAt` | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 수정 시간 |

### 🔗 관계
- `OneToMany` → **messages** (채팅방의 메시지들)

### 📌 인덱스
- `participants` (배열 검색 최적화 - GIN 인덱스 권장)
- `updatedAt` (정렬 최적화)

### 💡 비즈니스 로직
- participants는 사용자 ID(UUID)의 배열
- 사용자 참여/퇴장 시 participants 배열 업데이트
- updatedAt은 새 메시지 발송 시 자동 갱신
- 1:1 채팅: participants.length = 2
- 그룹 채팅: participants.length > 2

### 📊 예시 데이터
```sql
{
  "id": "room-uuid-123",
  "name": "김철수, 이영희, 박민수",
  "description": "3명의 채팅방",
  "participants": [
    "user-uuid-1",
    "user-uuid-2",
    "user-uuid-3"
  ],
  "createdAt": "2025-10-07T10:00:00.000Z",
  "updatedAt": "2025-10-07T15:30:00.000Z"
}
```

### 🔍 주요 쿼리
```sql
-- 특정 사용자가 참여한 채팅방 찾기
SELECT * FROM chat_rooms 
WHERE 'user-uuid' = ANY(participants) 
ORDER BY "updatedAt" DESC;

-- 특정 채팅방의 참여자 수
SELECT name, array_length(participants, 1) as participant_count 
FROM chat_rooms 
WHERE id = 'room-uuid';
```

---

## 4. messages (메시지)

### 📝 설명
채팅 메시지를 저장하는 테이블입니다.

### 🗂️ 컬럼 정보

| 컬럼명 | 타입 | 제약조건 | 기본값 | 설명 |
|--------|------|----------|--------|------|
| `id` | UUID | PRIMARY KEY | auto-generated | 메시지 고유 ID |
| `roomId` | UUID | NOT NULL, FOREIGN KEY | - | 채팅방 ID (chat_rooms 참조) |
| `userId` | UUID | NOT NULL, FOREIGN KEY | - | 발신자 ID (users 참조) |
| `content` | TEXT | NOT NULL | - | 메시지 내용 |
| `type` | ENUM | NOT NULL | 'text' | 메시지 타입 |
| `fileUrl` | VARCHAR | NULLABLE | null | 파일 URL |
| `fileName` | VARCHAR | NULLABLE | null | 파일명 |
| `fileSize` | INTEGER | NULLABLE | null | 파일 크기 (bytes) |
| `timestamp` | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 메시지 전송 시간 |

### 🎯 ENUM 값

#### type (메시지 타입)
- `text` - 일반 텍스트 메시지
- `image` - 이미지 파일
- `video` - 비디오 파일
- `file` - 기타 파일

### 🔗 관계
- `ManyToOne` → **chat_rooms** (메시지가 속한 채팅방)
- `ManyToOne` → **users** (메시지를 보낸 사용자)

### 📌 인덱스
- `roomId` (채팅방별 메시지 조회 최적화)
- `userId` (사용자별 메시지 조회 최적화)
- `timestamp` (시간순 정렬 최적화)

### 💡 비즈니스 로직
- type이 'text'가 아니면 fileUrl, fileName, fileSize 필수
- timestamp는 서버 시간 기준 자동 생성
- 메시지 삭제 시 소프트 삭제 권장 (추후 구현)

### 📊 예시 데이터

#### 텍스트 메시지
```sql
{
  "id": "msg-uuid-1",
  "roomId": "room-uuid-123",
  "userId": "user-uuid-1",
  "content": "안녕하세요!",
  "type": "text",
  "fileUrl": null,
  "fileName": null,
  "fileSize": null,
  "timestamp": "2025-10-07T15:30:00.000Z"
}
```

#### 이미지 메시지
```sql
{
  "id": "msg-uuid-2",
  "roomId": "room-uuid-123",
  "userId": "user-uuid-1",
  "content": "사진 보내드려요",
  "type": "image",
  "fileUrl": "/uploads/images/abc123.jpg",
  "fileName": "photo.jpg",
  "fileSize": 1024000,
  "timestamp": "2025-10-07T15:31:00.000Z"
}
```

### 🔍 주요 쿼리
```sql
-- 특정 채팅방의 최근 메시지 50개
SELECT * FROM messages 
WHERE "roomId" = 'room-uuid' 
ORDER BY timestamp DESC 
LIMIT 50;

-- 특정 사용자가 보낸 모든 메시지
SELECT * FROM messages 
WHERE "userId" = 'user-uuid' 
ORDER BY timestamp DESC;

-- 파일 타입별 메시지 통계
SELECT type, COUNT(*) as count, SUM("fileSize") as total_size
FROM messages 
WHERE type != 'text'
GROUP BY type;
```

---

## 5. 관계도

```
┌─────────────────────┐
│      users          │
│  (사용자)           │
├─────────────────────┤
│ PK: id (UUID)       │
│ • name              │
│ • email (UNIQUE)    │
│ • password          │
│ • phone             │
│ • birthday          │
│ • isActive          │
│ • lastLoginAt       │
│ • createdAt         │
│ • updatedAt         │
└─────────┬───────────┘
          │ 1
          │
          │ N
          ▼
┌─────────────────────┐         N         ┌─────────────────────┐
│    chat_rooms       │◄──────────────────│     messages        │
│    (채팅방)         │                   │     (메시지)        │
├─────────────────────┤                   ├─────────────────────┤
│ PK: id (UUID)       │                   │ PK: id (UUID)       │
│ • name              │                   │ FK: roomId          │
│ • description       │                   │ FK: userId          │
│ • participants[]    │                   │ • content           │
│ • createdAt         │                   │ • type (ENUM)       │
│ • updatedAt         │                   │ • fileUrl           │
└─────────────────────┘                   │ • fileName          │
                                          │ • fileSize          │
                                          │ • timestamp         │
                                          └─────────────────────┘

┌─────────────────────────────┐
│   email_verifications       │
│   (이메일 인증)             │
├─────────────────────────────┤
│ PK: id (UUID)               │
│ • email                     │
│ • token                     │
│ • type ('signup'/'reset')   │
│ • expiresAt                 │
│ • isVerified                │
│ • userData (JSONB)          │
│ • createdAt                 │
│ • updatedAt                 │
└─────────────────────────────┘
```

---

## 📈 데이터베이스 통계

### 현재 테이블 개수: **4개**

| 테이블명 | 목적 | 평균 레코드 크기 |
|----------|------|-----------------|
| users | 사용자 정보 | ~500 bytes |
| email_verifications | 임시 인증 데이터 | ~800 bytes |
| chat_rooms | 채팅방 메타데이터 | ~300 bytes |
| messages | 채팅 메시지 | ~200-5000 bytes |

---

## 🔧 권장 설정

### PostgreSQL 인덱스 최적화
```sql
-- participants 배열 검색 최적화 (GIN 인덱스)
CREATE INDEX idx_chat_rooms_participants ON chat_rooms USING GIN (participants);

-- 메시지 조회 최적화
CREATE INDEX idx_messages_room_timestamp ON messages (roomId, timestamp DESC);
CREATE INDEX idx_messages_user_timestamp ON messages (userId, timestamp DESC);

-- 이메일 인증 조회 최적화
CREATE INDEX idx_email_verifications_email ON email_verifications (email);
CREATE INDEX idx_email_verifications_token ON email_verifications (token);
```

### 성능 고려사항
1. **chat_rooms.participants**: GIN 인덱스로 배열 검색 최적화
2. **messages.timestamp**: 메시지는 시간순 정렬이 빈번하므로 인덱스 필수
3. **users.email**: UNIQUE 제약조건으로 자동 인덱스 생성됨
4. **정기 VACUUM**: 대량 메시지 삭제 후 실행 권장

---

## 🗄️ 데이터베이스 설정

### 연결 정보
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres123
DB_DATABASE=suchat
```

### TypeORM 설정
```typescript
{
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [User, EmailVerification, ChatRoom, Message],
  synchronize: process.env.NODE_ENV === 'development', // 프로덕션에서는 false
  logging: process.env.NODE_ENV === 'development',
}
```

---

## 🧪 테스트 쿼리

### 사용자 통계
```sql
-- 전체 사용자 수
SELECT COUNT(*) as total_users FROM users;

-- 활성 사용자 수
SELECT COUNT(*) as active_users FROM users WHERE "isActive" = true;

-- 최근 가입자 5명
SELECT id, name, email, "createdAt" 
FROM users 
ORDER BY "createdAt" DESC 
LIMIT 5;
```

### 채팅방 통계
```sql
-- 전체 채팅방 수
SELECT COUNT(*) as total_rooms FROM chat_rooms;

-- 참여자 수별 채팅방 통계
SELECT 
  array_length(participants, 1) as participant_count,
  COUNT(*) as room_count
FROM chat_rooms 
GROUP BY array_length(participants, 1);

-- 가장 활발한 채팅방 TOP 5
SELECT 
  cr.id, 
  cr.name, 
  COUNT(m.id) as message_count
FROM chat_rooms cr
LEFT JOIN messages m ON m."roomId" = cr.id
GROUP BY cr.id, cr.name
ORDER BY message_count DESC
LIMIT 5;
```

### 메시지 통계
```sql
-- 전체 메시지 수
SELECT COUNT(*) as total_messages FROM messages;

-- 메시지 타입별 통계
SELECT type, COUNT(*) as count 
FROM messages 
GROUP BY type;

-- 오늘 보낸 메시지 수
SELECT COUNT(*) as today_messages 
FROM messages 
WHERE DATE(timestamp) = CURRENT_DATE;

-- 파일 총 용량
SELECT 
  type,
  COUNT(*) as file_count,
  SUM("fileSize") as total_size_bytes,
  ROUND(SUM("fileSize")::numeric / 1024 / 1024, 2) as total_size_mb
FROM messages 
WHERE type != 'text'
GROUP BY type;
```

---

## 🔐 보안 고려사항

### 1. 비밀번호
- ✅ bcrypt 해시 사용 (salt rounds: 10)
- ✅ 평문 비밀번호 절대 저장 안 함
- ✅ API 응답에서 password 제외

### 2. 데이터 접근
- ✅ 사용자는 자신의 데이터만 수정 가능
- ✅ 채팅방 참여자만 메시지 조회 가능
- ⚠️ JWT 인증 구현 필요 (추후)

### 3. SQL Injection 방지
- ✅ TypeORM 파라미터 바인딩 사용
- ✅ 직접 SQL 쿼리 최소화

---

## 📝 마이그레이션 히스토리

### v1.0.0 (현재)
- ✅ users 테이블 생성
- ✅ email_verifications 테이블 생성
- ✅ chat_rooms 테이블 생성
- ✅ messages 테이블 생성
- ✅ 기본 인덱스 설정

### 향후 계획
- [ ] 친구 관계 테이블 (friends)
- [ ] 친구 요청 테이블 (friend_requests)
- [ ] 메시지 읽음 표시 테이블 (message_reads)
- [ ] 알림 테이블 (notifications)

---

**생성일**: 2025-10-07  
**버전**: 1.0.0  
**데이터베이스**: PostgreSQL 15  
**ORM**: TypeORM

