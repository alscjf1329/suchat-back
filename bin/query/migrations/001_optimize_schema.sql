-- ========================================
-- SuChat 데이터베이스 최적화 마이그레이션
-- Version: 1.0.0
-- Date: 2025-10-07
-- ========================================

-- 1. chat_room_participants 테이블 생성
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

-- 2. chat_rooms 테이블에 컬럼 추가
ALTER TABLE chat_rooms 
ADD COLUMN IF NOT EXISTS "lastMessageId" UUID,
ADD COLUMN IF NOT EXISTS "lastMessageAt" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "dmKey" VARCHAR(255) UNIQUE;

-- 3. 기존 participants 배열 데이터를 chat_room_participants로 마이그레이션
INSERT INTO chat_room_participants ("roomId", "userId", role, "joinedAt")
SELECT 
  cr.id as "roomId",
  unnest(cr.participants)::UUID as "userId",  -- UUID로 명시적 캐스팅
  'member' as role,  -- 기존 사용자는 모두 member
  cr."createdAt" as "joinedAt"
FROM chat_rooms cr
WHERE array_length(cr.participants, 1) > 0
ON CONFLICT ("roomId", "userId") DO NOTHING;

-- 첫 번째 참여자를 owner로 변경
UPDATE chat_room_participants crp
SET role = 'owner'
WHERE (crp."roomId", crp."joinedAt") IN (
  SELECT "roomId", MIN("joinedAt")
  FROM chat_room_participants
  GROUP BY "roomId"
);

-- 4. 인덱스 생성

-- A. chat_room_participants 인덱스
CREATE INDEX IF NOT EXISTS idx_crp_user ON chat_room_participants ("userId");
CREATE INDEX IF NOT EXISTS idx_crp_room ON chat_room_participants ("roomId");
CREATE INDEX IF NOT EXISTS idx_crp_lastread ON chat_room_participants ("roomId", "lastReadMessageId");

-- B. chat_rooms 인덱스
CREATE INDEX IF NOT EXISTS idx_chat_rooms_last_at ON chat_rooms ("lastMessageAt" DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_dmkey ON chat_rooms ("dmKey") WHERE "dmKey" IS NOT NULL;

-- C. messages 인덱스 (키셋 페이지네이션)
DROP INDEX IF EXISTS idx_messages_room_ts;  -- 기존 인덱스 제거
CREATE INDEX IF NOT EXISTS idx_messages_room_ts_id ON messages ("roomId", "timestamp" DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_messages_user_ts ON messages ("userId", "timestamp" DESC);

-- 5. 통계 업데이트 (선택사항)
ANALYZE chat_room_participants;
ANALYZE chat_rooms;
ANALYZE messages;

-- ========================================
-- 롤백 스크립트 (문제 발생 시 사용)
-- ========================================
/*
-- 인덱스 제거
DROP INDEX IF EXISTS idx_crp_user;
DROP INDEX IF EXISTS idx_crp_room;
DROP INDEX IF EXISTS idx_crp_lastread;
DROP INDEX IF EXISTS idx_chat_rooms_last_at;
DROP INDEX IF EXISTS idx_chat_rooms_dmkey;
DROP INDEX IF EXISTS idx_messages_room_ts_id;
DROP INDEX IF EXISTS idx_messages_user_ts;

-- 컬럼 제거
ALTER TABLE chat_rooms 
DROP COLUMN IF EXISTS "lastMessageId",
DROP COLUMN IF EXISTS "lastMessageAt",
DROP COLUMN IF EXISTS "dmKey";

-- 테이블 제거
DROP TABLE IF EXISTS chat_room_participants CASCADE;
*/

-- ========================================
-- 확인 쿼리
-- ========================================

-- 1. 참여자 수 확인
SELECT 
  cr.id,
  cr.name,
  COUNT(crp."userId") as participant_count
FROM chat_rooms cr
LEFT JOIN chat_room_participants crp ON crp."roomId" = cr.id
GROUP BY cr.id, cr.name
ORDER BY cr."createdAt" DESC
LIMIT 10;

-- 2. 역할별 참여자 수
SELECT role, COUNT(*) as count 
FROM chat_room_participants 
GROUP BY role;

-- 3. 인덱스 확인
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('chat_room_participants', 'chat_rooms', 'messages')
ORDER BY tablename, indexname;

-- 완료!
SELECT '✅ 마이그레이션 완료!' as status;

