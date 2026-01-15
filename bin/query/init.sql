-- ========================================
-- SuChat 데이터베이스 초기화 스크립트
-- Version: 1.2.0
-- Date: 2025-01-XX
-- ========================================
-- 
-- 사용법:
-- 1. Docker: Get-Content bin/query/init.sql | docker exec -i suchat-postgres psql -U postgres -d suchat
-- 2. pgAdmin: 전체 복사 후 실행
-- 3. DBeaver: 전체 복사 후 실행
--
-- ========================================

-- ========================================
-- 1. 테이블 생성
-- ========================================

-- 1.1 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  birthday DATE,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastLoginAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 1.2 이메일 인증 테이블
CREATE TABLE IF NOT EXISTS email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'signup',
  "expiresAt" TIMESTAMP NOT NULL,
  "isVerified" BOOLEAN NOT NULL DEFAULT false,
  "userData" JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 1.3 채팅방 테이블 (최적화됨)
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  participants TEXT[] DEFAULT '{}',
  "lastMessageId" UUID,
  "lastMessageAt" TIMESTAMP,
  "dmKey" VARCHAR(255) UNIQUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 1.4 채팅방 참여자 테이블 (신규)
CREATE TABLE IF NOT EXISTS chat_room_participants (
  "roomId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  "lastReadMessageId" UUID,
  muted BOOLEAN NOT NULL DEFAULT false,
  pinned BOOLEAN NOT NULL DEFAULT false,
  "joinedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("roomId", "userId"),
  FOREIGN KEY ("roomId") REFERENCES chat_rooms(id) ON DELETE CASCADE,
  FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

-- 1.5 메시지 테이블
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "roomId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image', 'video', 'file')),
  "fileUrl" VARCHAR(500),
  "fileName" VARCHAR(255),
  "fileSize" INTEGER,
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("roomId") REFERENCES chat_rooms(id) ON DELETE CASCADE,
  FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

-- 1.6 친구 관계 테이블
CREATE TABLE IF NOT EXISTS friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "requesterId" UUID NOT NULL,
  "addresseeId" UUID NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("requesterId") REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY ("addresseeId") REFERENCES users(id) ON DELETE CASCADE
);

-- 1.7 Refresh Token 테이블
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  token VARCHAR(500) NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

-- 1.8 푸시 알림 구독 테이블
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL UNIQUE,
  endpoint TEXT NOT NULL,
  p256dh VARCHAR(255) NOT NULL,
  auth VARCHAR(255) NOT NULL,
  "userAgent" VARCHAR(500),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

-- 1.9 일정 테이블
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "roomId" UUID NOT NULL,
  "createdBy" UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  memo TEXT,
  "startDate" VARCHAR(14) NOT NULL,
  "endDate" VARCHAR(14),
  "notificationDateTime" VARCHAR(14),
  "notificationInterval" VARCHAR(10),
  "notificationRepeatCount" VARCHAR(10),
  "notificationSent" SMALLINT NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("roomId") REFERENCES chat_rooms(id) ON DELETE CASCADE,
  FOREIGN KEY ("createdBy") REFERENCES users(id) ON DELETE CASCADE
);

-- 1.10 일정 참여자 테이블
CREATE TABLE IF NOT EXISTS schedule_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "scheduleId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("scheduleId") REFERENCES schedules(id) ON DELETE CASCADE,
  FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE ("scheduleId", "userId")
);

-- ========================================
-- 2. 인덱스 생성 (성능 최적화)
-- ========================================

-- 2.1 users 인덱스
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_lastlogin ON users("lastLoginAt");

-- 2.2 email_verifications 인덱스
CREATE UNIQUE INDEX IF NOT EXISTS idx_ev_token ON email_verifications(token);
CREATE INDEX IF NOT EXISTS idx_ev_email ON email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_ev_expires ON email_verifications("expiresAt") WHERE "isVerified" = false;

-- 2.3 chat_rooms 인덱스 (최적화)
CREATE INDEX IF NOT EXISTS idx_chat_rooms_last_at ON chat_rooms("lastMessageAt" DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_dmkey ON chat_rooms("dmKey") WHERE "dmKey" IS NOT NULL;

-- 2.4 chat_room_participants 인덱스
CREATE INDEX IF NOT EXISTS idx_crp_user ON chat_room_participants("userId");
CREATE INDEX IF NOT EXISTS idx_crp_room ON chat_room_participants("roomId");
CREATE INDEX IF NOT EXISTS idx_crp_lastread ON chat_room_participants("roomId", "lastReadMessageId");

-- 2.5 messages 인덱스 (키셋 페이지네이션)
CREATE INDEX IF NOT EXISTS idx_messages_room_ts_id ON messages("roomId", "timestamp" DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_messages_user_ts ON messages("userId", "timestamp" DESC);

-- 2.6 friends 인덱스 (친구 관계 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_friends_requester ON friends("requesterId");
CREATE INDEX IF NOT EXISTS idx_friends_addressee ON friends("addresseeId");
CREATE INDEX IF NOT EXISTS idx_friends_status ON friends(status);
CREATE INDEX IF NOT EXISTS idx_friends_pair ON friends("requesterId", "addresseeId");

-- 2.7 refresh_tokens 인덱스 (토큰 갱신 최적화)
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens("userId");
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens("expiresAt");

-- 2.8 push_subscriptions 인덱스 (푸시 알림 최적화)
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions("userId");
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions("isActive") WHERE "isActive" = true;

-- 2.9 schedules 인덱스 (일정 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_schedules_room ON schedules("roomId");
CREATE INDEX IF NOT EXISTS idx_schedules_created_by ON schedules("createdBy");
CREATE INDEX IF NOT EXISTS idx_schedules_start_date ON schedules("startDate");
CREATE INDEX IF NOT EXISTS idx_schedules_room_start ON schedules("roomId", "startDate" DESC);
-- 배치 알림 쿼리 최적화 (notificationDateTime 필터링)
CREATE INDEX IF NOT EXISTS idx_schedules_notification_datetime 
  ON schedules("notificationDateTime") 
  WHERE "notificationDateTime" IS NOT NULL;
-- 배치 알림 쿼리 최적화 (복합 인덱스: notificationDateTime + startDate)
CREATE INDEX IF NOT EXISTS idx_schedules_notification_and_start 
  ON schedules("notificationDateTime", "startDate") 
  WHERE "notificationDateTime" IS NOT NULL;

-- 2.10 schedule_participants 인덱스 (일정 참여자 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_schedule_participants_schedule ON schedule_participants("scheduleId");
CREATE INDEX IF NOT EXISTS idx_schedule_participants_user ON schedule_participants("userId");

-- ========================================
-- 3. 트리거 생성 (자동 updatedAt)
-- ========================================

-- updatedAt 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- users 트리거
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- chat_rooms 트리거
DROP TRIGGER IF EXISTS update_chat_rooms_updated_at ON chat_rooms;
CREATE TRIGGER update_chat_rooms_updated_at 
  BEFORE UPDATE ON chat_rooms 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- push_subscriptions 트리거
DROP TRIGGER IF EXISTS update_push_subscriptions_updated_at ON push_subscriptions;
CREATE TRIGGER update_push_subscriptions_updated_at 
  BEFORE UPDATE ON push_subscriptions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- schedules 트리거
DROP TRIGGER IF EXISTS update_schedules_updated_at ON schedules;
CREATE TRIGGER update_schedules_updated_at 
  BEFORE UPDATE ON schedules 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 4. 임시 사용자 데이터 생성 (테스트용)
-- ========================================

-- 비밀번호: password123 (모든 계정 동일)
INSERT INTO users (id, name, email, password, phone, birthday, "isActive", "lastLoginAt", "createdAt", "updatedAt")
VALUES
  ('e5f3c8a0-1234-4567-89ab-000000000001', '김철수', 'kim@example.com', '$2b$10$rK5qZ.VqQxWJh1YkLGZJK.N8YGZqZ5mJZ5qZ5qZ5qZ5qZ5qZ5qZ5qO', '010-1111-1111', '1990-01-15', true, NOW(), NOW(), NOW()),
  ('e5f3c8a0-1234-4567-89ab-000000000002', '이영희', 'lee@example.com', '$2b$10$rK5qZ.VqQxWJh1YkLGZJK.N8YGZqZ5mJZ5qZ5qZ5qZ5qZ5qZ5qZ5qO', '010-2222-2222', '1992-03-20', true, NOW(), NOW(), NOW()),
  ('e5f3c8a0-1234-4567-89ab-000000000003', '박민수', 'park@example.com', '$2b$10$rK5qZ.VqQxWJh1YkLGZJK.N8YGZqZ5mJZ5qZ5qZ5qZ5qZ5qZ5qZ5qO', '010-3333-3333', '1988-07-10', true, NOW(), NOW(), NOW()),
  ('e5f3c8a0-1234-4567-89ab-000000000004', '정수진', 'jung@example.com', '$2b$10$rK5qZ.VqQxWJh1YkLGZJK.N8YGZqZ5mJZ5qZ5qZ5qZ5qZ5qZ5qZ5qO', '010-4444-4444', '1995-11-25', true, NOW(), NOW(), NOW()),
  ('e5f3c8a0-1234-4567-89ab-000000000005', '최동현', 'choi@example.com', '$2b$10$rK5qZ.VqQxWJh1YkLGZJK.N8YGZqZ5mJZ5qZ5qZ5qZ5qZ5qZ5qZ5qO', '010-5555-5555', '1991-05-08', true, NOW(), NOW(), NOW()),
  ('e5f3c8a0-1234-4567-89ab-000000000006', '한지영', 'han@example.com', '$2b$10$rK5qZ.VqQxWJh1YkLGZJK.N8YGZqZ5mJZ5qZ5qZ5qZ5qZ5qZ5qZ5qO', '010-6666-6666', '1993-09-17', true, NOW(), NOW(), NOW()),
  ('e5f3c8a0-1234-4567-89ab-000000000007', '강민호', 'kang@example.com', '$2b$10$rK5qZ.VqQxWJh1YkLGZJK.N8YGZqZ5mJZ5qZ5qZ5qZ5qZ5qZ5qZ5qO', '010-7777-7777', '1989-12-30', true, NOW(), NOW(), NOW()),
  ('e5f3c8a0-1234-4567-89ab-000000000008', '윤서연', 'yoon@example.com', '$2b$10$rK5qZ.VqQxWJh1YkLGZJK.N8YGZqZ5mJZ5qZ5qZ5qZ5qZ5qZ5qZ5qO', '010-8888-8888', '1994-04-22', true, NOW(), NOW(), NOW()),
  ('e5f3c8a0-1234-4567-89ab-000000000009', '조현우', 'jo@example.com', '$2b$10$rK5qZ.VqQxWJh1YkLGZJK.N8YGZqZ5mJZ5qZ5qZ5qZ5qZ5qZ5qZ5qO', '010-9999-9999', '1987-06-14', true, NOW(), NOW(), NOW()),
  ('e5f3c8a0-1234-4567-89ab-000000000010', '임수빈', 'lim@example.com', '$2b$10$rK5qZ.VqQxWJh1YkLGZJK.N8YGZqZ5mJZ5qZ5qZ5qZ5qZ5qZ5qZ5qO', '010-1010-1010', '1996-08-05', true, NOW(), NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- ========================================
-- 5. 통계 및 확인
-- ========================================

-- 테이블 통계
ANALYZE users;
ANALYZE email_verifications;
ANALYZE chat_rooms;
ANALYZE chat_room_participants;
ANALYZE messages;
ANALYZE friends;
ANALYZE refresh_tokens;
ANALYZE push_subscriptions;
ANALYZE schedules;
ANALYZE schedule_participants;

-- 확인 쿼리
SELECT 
  'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'chat_rooms', COUNT(*) FROM chat_rooms
UNION ALL
SELECT 'chat_room_participants', COUNT(*) FROM chat_room_participants
UNION ALL
SELECT 'messages', COUNT(*) FROM messages
UNION ALL
SELECT 'friends', COUNT(*) FROM friends
UNION ALL
SELECT 'push_subscriptions', COUNT(*) FROM push_subscriptions
UNION ALL
SELECT 'schedules', COUNT(*) FROM schedules
UNION ALL
SELECT 'schedule_participants', COUNT(*) FROM schedule_participants
ORDER BY table_name;

-- 인덱스 확인
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('users', 'chat_rooms', 'chat_room_participants', 'messages', 'friends', 'push_subscriptions', 'schedules', 'schedule_participants')
ORDER BY tablename, indexname;

-- ========================================
-- 완료 메시지
-- ========================================
SELECT '✅ SuChat 데이터베이스 초기화 완료!' as status;
SELECT '📊 테스트 계정: kim@example.com / password123' as info;
SELECT '🚀 백엔드를 재시작하세요: npm run start:dev' as next_step;

