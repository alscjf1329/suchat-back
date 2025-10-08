-- ========================================
-- SuChat 성능 최적화 인덱스 추가
-- ========================================
-- TypeORM synchronize로 생성 안 되는 최적화 인덱스들
-- ========================================

-- 1. chat_room_participants 인덱스 (참여자 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_crp_user 
ON chat_room_participants("userId");

CREATE INDEX IF NOT EXISTS idx_crp_room 
ON chat_room_participants("roomId");

CREATE INDEX IF NOT EXISTS idx_crp_lastread 
ON chat_room_participants("roomId", "lastReadMessageId");

-- 2. chat_rooms 인덱스 (채팅 목록 정렬 최적화)
CREATE INDEX IF NOT EXISTS idx_chat_rooms_last_at 
ON chat_rooms("lastMessageAt" DESC NULLS LAST);

-- 3. messages 인덱스 (키셋 페이지네이션 최적화)
CREATE INDEX IF NOT EXISTS idx_messages_room_ts_id 
ON messages("roomId", "timestamp" DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_messages_user_ts 
ON messages("userId", "timestamp" DESC);

-- 4. 추가 최적화 인덱스 (선택사항)
CREATE INDEX IF NOT EXISTS idx_users_lastlogin 
ON users("lastLoginAt");

CREATE INDEX IF NOT EXISTS idx_ev_token 
ON email_verifications(token);

-- ========================================
-- 통계 업데이트
-- ========================================
ANALYZE chat_room_participants;
ANALYZE chat_rooms;
ANALYZE messages;

-- ========================================
-- 확인
-- ========================================
SELECT 
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('chat_room_participants', 'chat_rooms', 'messages')
ORDER BY tablename, indexname;

SELECT '✅ 최적화 인덱스 추가 완료!' as status;

