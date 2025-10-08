# 🚀 데이터베이스 마이그레이션 가이드

## 📋 개요

SuChat 백엔드의 데이터베이스 최적화 마이그레이션 가이드입니다.

## ✅ 완료된 작업

### 1. **새 테이블 생성**
- ✅ `chat_room_participants` - 채팅방 참여자 관리 테이블
- ✅ 권한 관리 (owner, admin, member)
- ✅ 읽음 표시 (lastReadMessageId)
- ✅ 개인 설정 (muted, pinned)

### 2. **컬럼 추가**
- ✅ `chat_rooms.lastMessageId` - 최근 메시지 ID
- ✅ `chat_rooms.lastMessageAt` - 최근 메시지 시간
- ✅ `chat_rooms.dmKey` - DM 중복 방지 키

### 3. **인덱스 최적화**
- ✅ `idx_crp_user` - 사용자별 참여방 조회
- ✅ `idx_crp_room` - 방별 참여자 조회
- ✅ `idx_crp_lastread` - 읽음 처리
- ✅ `idx_chat_rooms_last_at` - 방 목록 정렬
- ✅ `idx_messages_room_ts_id` - 키셋 페이지네이션

## 🔧 실행 방법

### Option 1: pgAdmin에서 실행 (권장)

1. **pgAdmin 접속**
   - URL: http://localhost:8080
   - 이메일: admin@suchat.com
   - 비밀번호: admin123

2. **쿼리 실행**
   - `suchat` 데이터베이스 선택
   - Tools → Query Tool
   - `migrations/001_optimize_schema.sql` 파일 내용 복사
   - Execute (F5)

3. **데이터 마이그레이션**
   - `migrations/002_migrate_data.sql` 파일 내용 복사
   - Execute (F5)

### Option 2: DBeaver에서 실행

1. **연결 설정**
   - PostgreSQL 선택
   - Host: localhost:5432
   - Database: suchat
   - User: postgres
   - Password: postgres123

2. **SQL 실행**
   - `migrations/001_optimize_schema.sql` 실행
   - `migrations/002_migrate_data.sql` 실행

## 📊 마이그레이션 전후 비교

### Before (기존)
```sql
chat_rooms
├── participants: TEXT[] (배열)
└── 쿼리: WHERE 'user' = ANY(participants)
```

**문제점:**
- ❌ 배열 검색 느림
- ❌ 역할 관리 불가
- ❌ 읽음 표시 불가
- ❌ 개인 설정 불가

### After (최적화)
```sql
chat_rooms
├── lastMessageId: UUID
├── lastMessageAt: TIMESTAMP
└── dmKey: VARCHAR (DM 중복 방지)

chat_room_participants (NEW!)
├── roomId + userId (복합 PK)
├── role (owner/admin/member)
├── lastReadMessageId (읽음 표시)
├── muted, pinned (개인 설정)
└── 쿼리: JOIN chat_room_participants
```

**개선점:**
- ✅ 빠른 참여자 조회
- ✅ 역할 관리 가능
- ✅ 읽음 표시 가능
- ✅ 개인 설정 가능
- ✅ DM 중복 방지

## 🎯 새로운 기능

### 1. 읽음 표시
```typescript
// Socket 이벤트
socket.emit('mark_as_read', { 
  roomId, 
  userId, 
  messageId 
})

// 안읽은 메시지 수 자동 전송
socket.on('unread_count', ({ roomId, count }) => {
  // UI 업데이트
})
```

### 2. DM 중복 방지
```typescript
// 1:1 채팅 생성 시 자동으로 dmKey 생성
// "user1:user2" (정렬된 형태)
// 같은 사용자끼리 여러 DM 생성 방지
```

### 3. 키셋 페이지네이션
```typescript
// 더 빠른 메시지 로딩
getRoomMessages(roomId, limit, cursor)

// 이전 메시지 더 보기
const cursor = { 
  timestamp: oldestMessage.timestamp, 
  id: oldestMessage.id 
}
```

## 🔍 확인 쿼리

### 참여자 현황
```sql
SELECT role, COUNT(*) 
FROM chat_room_participants 
GROUP BY role;
```

### 채팅방별 참여자
```sql
SELECT 
  cr.name,
  crp.role,
  u.name as user_name
FROM chat_rooms cr
JOIN chat_room_participants crp ON crp."roomId" = cr.id
JOIN users u ON u.id = crp."userId"
ORDER BY cr.name, crp.role;
```

### 안읽은 메시지 수 (특정 사용자)
```sql
SELECT 
  cr.name,
  COUNT(m.id) as unread_count
FROM chat_rooms cr
JOIN chat_room_participants crp ON crp."roomId" = cr.id
LEFT JOIN messages m ON m."roomId" = cr.id 
  AND m.id > COALESCE(crp."lastReadMessageId", '00000000-0000-0000-0000-000000000000'::UUID)
WHERE crp."userId" = 'your-user-id'
GROUP BY cr.id, cr.name;
```

## ⚠️ 주의사항

### 하위 호환성
- `chat_rooms.participants` 배열은 **당분간 유지**
- 신규 데이터는 `chat_room_participants`에 저장
- 구 데이터도 양쪽에 모두 저장 (이중 쓰기)
- 마이그레이션 완료 확인 후 participants 컬럼 제거 예정

### 성능 모니터링
```sql
-- 쿼리 실행 계획 확인
EXPLAIN ANALYZE
SELECT * FROM chat_rooms cr
JOIN chat_room_participants crp ON crp."roomId" = cr.id
WHERE crp."userId" = 'user-id';
```

## 🔄 롤백

문제 발생 시 `migrations/001_optimize_schema.sql` 하단의 롤백 스크립트 실행

---

**생성일**: 2025-10-07  
**적용 상태**: ✅ 테이블/인덱스 생성 완료  
**다음 단계**: 데이터 마이그레이션 (`002_migrate_data.sql`)

