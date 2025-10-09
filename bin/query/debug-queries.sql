-- ========================================
-- SuChat 디버깅 및 확인 쿼리 모음
-- ========================================
-- 
-- 개발 중 문제 발생 시 사용하는 유용한 쿼리들
-- 
-- ========================================

-- ========================================
-- 1. 기본 테이블 통계
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
-- 2. 안읽은 메시지 디버깅
-- ========================================

-- 2.1 특정 채팅방의 모든 메시지 (시간순)
-- SELECT 
--   id,
--   content,
--   timestamp,
--   "userId"
-- FROM messages 
-- WHERE "roomId" = 'YOUR-ROOM-ID-HERE'
-- ORDER BY timestamp, id;

-- 2.2 해당 채팅방 참여자들의 읽음 상태
-- SELECT 
--   u.name,
--   crp."userId",
--   crp."lastReadMessageId",
--   (SELECT content FROM messages WHERE id = crp."lastReadMessageId") as last_read_content,
--   (SELECT timestamp FROM messages WHERE id = crp."lastReadMessageId") as last_read_time
-- FROM chat_room_participants crp
-- JOIN users u ON u.id = crp."userId"
-- WHERE crp."roomId" = 'YOUR-ROOM-ID-HERE';

-- 2.3 각 사용자별 안읽은 메시지 개수
-- SELECT 
--   u.name,
--   crp."userId",
--   crp."lastReadMessageId",
--   (
--     SELECT COUNT(*) 
--     FROM messages m
--     WHERE m."roomId" = 'YOUR-ROOM-ID-HERE'
--       AND (m.timestamp, m.id) > (
--         SELECT timestamp, id 
--         FROM messages 
--         WHERE id = crp."lastReadMessageId"
--       )
--   ) as unread_count
-- FROM chat_room_participants crp
-- JOIN users u ON u.id = crp."userId"
-- WHERE crp."roomId" = 'YOUR-ROOM-ID-HERE';

-- ========================================
-- 3. 사용자 채팅방 읽음 상태 전체 확인
-- ========================================

-- 특정 사용자의 모든 채팅방 읽음 상태
-- SELECT 
--   cr.name as room_name,
--   crp."userId",
--   u.name as user_name,
--   crp."lastReadMessageId",
--   (SELECT content FROM messages WHERE id = crp."lastReadMessageId") as last_read_message,
--   (SELECT timestamp FROM messages WHERE id = crp."lastReadMessageId") as last_read_time
-- FROM chat_room_participants crp
-- JOIN chat_rooms cr ON cr.id = crp."roomId"
-- JOIN users u ON u.id = crp."userId"
-- WHERE crp."userId" = 'YOUR-USER-ID-HERE'
-- ORDER BY crp."joinedAt" DESC;

-- ========================================
-- 4. 친구 관계 디버깅
-- ========================================

-- 4.1 특정 사용자의 친구 요청 상태
-- SELECT 
--   f.id,
--   f.status,
--   requester.name as requester_name,
--   addressee.name as addressee_name,
--   f."createdAt"
-- FROM friends f
-- JOIN users requester ON requester.id = f."requesterId"
-- JOIN users addressee ON addressee.id = f."addresseeId"
-- WHERE f."requesterId" = 'YOUR-USER-ID-HERE' 
--    OR f."addresseeId" = 'YOUR-USER-ID-HERE'
-- ORDER BY f."createdAt" DESC;

-- 4.2 친구 상태별 개수
SELECT 
  status,
  COUNT(*) as count
FROM friends
GROUP BY status
ORDER BY status;

-- ========================================
-- 5. 채팅방 참여자 확인
-- ========================================

-- 5.1 모든 채팅방과 참여자 수
SELECT 
  cr.id,
  cr.name,
  COUNT(crp."userId") as participant_count,
  array_agg(u.name) as participants
FROM chat_rooms cr
LEFT JOIN chat_room_participants crp ON crp."roomId" = cr.id
LEFT JOIN users u ON u.id = crp."userId"
GROUP BY cr.id, cr.name
ORDER BY cr."createdAt" DESC;

-- 5.2 특정 채팅방의 상세 참여자 정보
-- SELECT 
--   u.name,
--   crp.role,
--   crp."lastReadMessageId",
--   crp."joinedAt"
-- FROM chat_room_participants crp
-- JOIN users u ON u.id = crp."userId"
-- WHERE crp."roomId" = 'YOUR-ROOM-ID-HERE'
-- ORDER BY crp."joinedAt";

-- ========================================
-- 6. 인덱스 확인
-- ========================================

SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('users', 'chat_rooms', 'chat_room_participants', 'messages', 'friends')
ORDER BY tablename, indexname;

-- ========================================
-- 7. 최근 활동 확인
-- ========================================

-- 7.1 최근 생성된 채팅방 (10개)
SELECT 
  id,
  name,
  "createdAt"
FROM chat_rooms
ORDER BY "createdAt" DESC
LIMIT 10;

-- 7.2 최근 메시지 (20개)
SELECT 
  m.id,
  cr.name as room_name,
  u.name as user_name,
  m.content,
  m.timestamp
FROM messages m
JOIN chat_rooms cr ON cr.id = m."roomId"
JOIN users u ON u.id = m."userId"
ORDER BY m.timestamp DESC
LIMIT 20;

-- 7.3 최근 로그인한 사용자
SELECT 
  name,
  email,
  "lastLoginAt"
FROM users
WHERE "lastLoginAt" IS NOT NULL
ORDER BY "lastLoginAt" DESC
LIMIT 10;

-- ========================================
-- 8. 데이터베이스 크기 확인
-- ========================================

SELECT 
  pg_size_pretty(pg_database_size('suchat')) as database_size;

SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ========================================
-- 완료
-- ========================================
SELECT '✅ 디버깅 쿼리 실행 완료' as status;

