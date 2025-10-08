-- 현재 상태 정확히 확인

-- 1. 특정 채팅방의 모든 메시지 (시간순)
SELECT 
  id,
  content,
  timestamp,
  "userId"
FROM messages 
WHERE "roomId" = '97cc6980-0ac8-446a-8f66-f5ad5f04de78'
ORDER BY timestamp, id;

-- 2. 해당 채팅방 참여자들의 읽음 상태
SELECT 
  u.name,
  crp."userId",
  crp."lastReadMessageId",
  (SELECT content FROM messages WHERE id = crp."lastReadMessageId") as last_read_content,
  (SELECT timestamp FROM messages WHERE id = crp."lastReadMessageId") as last_read_time
FROM chat_room_participants crp
JOIN users u ON u.id = crp."userId"
WHERE crp."roomId" = '97cc6980-0ac8-446a-8f66-f5ad5f04de78';

-- 3. 각 사용자별 안읽은 메시지 (현재 쿼리 방식)
SELECT 
  u.name,
  crp."userId",
  crp."lastReadMessageId",
  (
    SELECT COUNT(*) 
    FROM messages m
    WHERE m."roomId" = '97cc6980-0ac8-446a-8f66-f5ad5f04de78'
      AND (m.timestamp, m.id) > (
        SELECT timestamp, id 
        FROM messages 
        WHERE id = crp."lastReadMessageId"
      )
  ) as unread_count
FROM chat_room_participants crp
JOIN users u ON u.id = crp."userId"
WHERE crp."roomId" = '97cc6980-0ac8-446a-8f66-f5ad5f04de78';

