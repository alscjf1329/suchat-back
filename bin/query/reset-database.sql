-- ========================================
-- SuChat 데이터베이스 완전 리셋 (원클릭)
-- ========================================
-- 
-- ⚠️ 주의: 이 스크립트는 모든 데이터를 삭제하고 재생성합니다!
-- 
-- 사용법: pgAdmin에서 이 파일 전체를 실행하세요
-- 
-- ========================================

-- STEP 1: 모든 테이블 삭제
-- ========================================

DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS chat_room_participants CASCADE;
DROP TABLE IF EXISTS chat_rooms CASCADE;
DROP TABLE IF EXISTS friends CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS email_verifications CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

SELECT '🗑️ 기존 테이블 삭제 완료' as step_1;

-- ========================================
-- STEP 2: 테이블 재생성
-- ========================================

-- 2.1 사용자 테이블
CREATE TABLE users (
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

-- 2.2 이메일 인증 테이블
CREATE TABLE email_verifications (
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

-- 2.3 채팅방 테이블
CREATE TABLE chat_rooms (
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

-- 2.4 채팅방 참여자 테이블
CREATE TABLE chat_room_participants (
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

-- 2.5 메시지 테이블
CREATE TABLE messages (
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

-- 2.6 친구 관계 테이블
CREATE TABLE friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "requesterId" UUID NOT NULL,
  "addresseeId" UUID NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("requesterId") REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY ("addresseeId") REFERENCES users(id) ON DELETE CASCADE
);

-- 2.7 Refresh Token 테이블
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  token VARCHAR(500) NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

SELECT '📊 테이블 재생성 완료 (7개)' as step_2;

-- ========================================
-- STEP 3: 인덱스 생성
-- ========================================

-- users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_lastlogin ON users("lastLoginAt");

-- email_verifications
CREATE UNIQUE INDEX idx_ev_token ON email_verifications(token);
CREATE INDEX idx_ev_email ON email_verifications(email);
CREATE INDEX idx_ev_expires ON email_verifications("expiresAt") WHERE "isVerified" = false;

-- chat_rooms
CREATE INDEX idx_chat_rooms_last_at ON chat_rooms("lastMessageAt" DESC NULLS LAST);
CREATE INDEX idx_chat_rooms_dmkey ON chat_rooms("dmKey") WHERE "dmKey" IS NOT NULL;

-- chat_room_participants
CREATE INDEX idx_crp_user ON chat_room_participants("userId");
CREATE INDEX idx_crp_room ON chat_room_participants("roomId");
CREATE INDEX idx_crp_lastread ON chat_room_participants("roomId", "lastReadMessageId");

-- messages
CREATE INDEX idx_messages_room_ts_id ON messages("roomId", "timestamp" DESC, id DESC);
CREATE INDEX idx_messages_user_ts ON messages("userId", "timestamp" DESC);

-- friends
CREATE INDEX idx_friends_requester ON friends("requesterId");
CREATE INDEX idx_friends_addressee ON friends("addresseeId");
CREATE INDEX idx_friends_status ON friends(status);
CREATE INDEX idx_friends_pair ON friends("requesterId", "addresseeId");

-- refresh_tokens
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens("userId");
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens("expiresAt");

SELECT '⚡ 인덱스 생성 완료 (20개)' as step_3;

-- ========================================
-- STEP 4: 트리거 생성
-- ========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_rooms_updated_at 
  BEFORE UPDATE ON chat_rooms 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

SELECT '🔄 트리거 생성 완료' as step_4;

-- ========================================
-- STEP 5: 테스트 데이터 생성
-- ========================================

-- 비밀번호: 111111 (모든 계정 동일)
INSERT INTO users (id, name, email, password, phone, birthday, "isActive", "lastLoginAt", "createdAt", "updatedAt")
VALUES
  ('e5f3c8a0-1234-4567-89ab-000000000000', '양민철', 'alscjf1329@gmail.com', '$2b$10$yts3bX5b9HI.vQVk5NZZcOcXc0cKoa2eMr54Vkoe8hfwfGI8VyBky', '010-0000-0000', '2000-12-19', true, NOW(), NOW(), NOW()),
  ('e5f3c8a0-1234-4567-89ab-000000000001', '김철수', 'kim@example.com', '$2b$10$yts3bX5b9HI.vQVk5NZZcOcXc0cKoa2eMr54Vkoe8hfwfGI8VyBky', '010-1111-1111', '1990-01-15', true, NOW(), NOW(), NOW()),
  ('e5f3c8a0-1234-4567-89ab-000000000002', '이영희', 'lee@example.com', '$2b$10$yts3bX5b9HI.vQVk5NZZcOcXc0cKoa2eMr54Vkoe8hfwfGI8VyBky', '010-2222-2222', '1992-03-20', true, NOW(), NOW(), NOW()),
  ('e5f3c8a0-1234-4567-89ab-000000000003', '박민수', 'park@example.com', '$2b$10$yts3bX5b9HI.vQVk5NZZcOcXc0cKoa2eMr54Vkoe8hfwfGI8VyBky', '010-3333-3333', '1988-07-10', true, NOW(), NOW(), NOW()),
  ('e5f3c8a0-1234-4567-89ab-000000000004', '정수진', 'jung@example.com', '$2b$10$yts3bX5b9HI.vQVk5NZZcOcXc0cKoa2eMr54Vkoe8hfwfGI8VyBky', '010-4444-4444', '1995-11-25', true, NOW(), NOW(), NOW()),
  ('e5f3c8a0-1234-4567-89ab-000000000005', '최동현', 'choi@example.com', '$2b$10$yts3bX5b9HI.vQVk5NZZcOcXc0cKoa2eMr54Vkoe8hfwfGI8VyBky', '010-5555-5555', '1991-05-08', true, NOW(), NOW(), NOW()),
  ('e5f3c8a0-1234-4567-89ab-000000000006', '한지영', 'han@example.com', '$2b$10$yts3bX5b9HI.vQVk5NZZcOcXc0cKoa2eMr54Vkoe8hfwfGI8VyBky', '010-6666-6666', '1993-09-17', true, NOW(), NOW(), NOW()),
  ('e5f3c8a0-1234-4567-89ab-000000000007', '강민호', 'kang@example.com', '$2b$10$yts3bX5b9HI.vQVk5NZZcOcXc0cKoa2eMr54Vkoe8hfwfGI8VyBky', '010-7777-7777', '1989-12-30', true, NOW(), NOW(), NOW()),
  ('e5f3c8a0-1234-4567-89ab-000000000008', '윤서연', 'yoon@example.com', '$2b$10$yts3bX5b9HI.vQVk5NZZcOcXc0cKoa2eMr54Vkoe8hfwfGI8VyBky', '010-8888-8888', '1994-04-22', true, NOW(), NOW(), NOW()),
  ('e5f3c8a0-1234-4567-89ab-000000000009', '조현우', 'jo@example.com', '$2b$10$yts3bX5b9HI.vQVk5NZZcOcXc0cKoa2eMr54Vkoe8hfwfGI8VyBky', '010-9999-9999', '1987-06-14', true, NOW(), NOW(), NOW()),
  ('e5f3c8a0-1234-4567-89ab-000000000010', '임수빈', 'lim@example.com', '$2b$10$yts3bX5b9HI.vQVk5NZZcOcXc0cKoa2eMr54Vkoe8hfwfGI8VyBky', '010-1010-1010', '1996-08-05', true, NOW(), NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

SELECT '👥 테스트 사용자 생성 완료 (10명)' as step_5;

-- ========================================
-- STEP 6: 통계 업데이트
-- ========================================

ANALYZE users;
ANALYZE email_verifications;
ANALYZE chat_rooms;
ANALYZE chat_room_participants;
ANALYZE messages;
ANALYZE friends;
ANALYZE refresh_tokens;

-- ========================================
-- 최종 확인
-- ========================================

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
ORDER BY table_name;

-- ========================================
-- 완료!
-- ========================================

SELECT '🎉 데이터베이스 완전 리셋 완료!' as result;
SELECT '📊 테이블: 7개, 인덱스: 20개, 사용자: 10명' as summary;
SELECT '🔐 JWT: Access Token 15분, Refresh Token 7일' as jwt_info;
SELECT '🚀 백엔드 재시작: npm run start:dev' as next_action;

