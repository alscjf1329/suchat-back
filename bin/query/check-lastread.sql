-- 읽음 처리 확인 쿼리

-- 특정 사용자의 모든 채팅방 읽음 상태
SELECT 
  cr.name as room_name,
  crp."userId",
  u.name as user_name,
  crp."lastReadMessageId",
  (SELECT content FROM messages WHERE id = crp."lastReadMessageId") as last_read_message,
  (SELECT timestamp FROM messages WHERE id = crp."lastReadMessageId") as last_read_time
FROM chat_room_participants crp
JOIN chat_rooms cr ON cr.id = crp."roomId"
JOIN users u ON u.id = crp."userId"
WHERE crp."userId" = 'YOUR-USER-ID-HERE'
ORDER BY crp."joinedAt" DESC;

-- 실시간 안읽은 개수 (특정 사용자)
SELECT 
  cr.name,
  COUNT(m.id) as unread_count
FROM chat_rooms cr
JOIN chat_room_participants crp ON crp."roomId" = cr.id
LEFT JOIN messages m ON m."roomId" = cr.id 
  AND (m.timestamp, m.id) > (
    SELECT timestamp, id 
    FROM messages 
    WHERE id = crp."lastReadMessageId"
  )
WHERE crp."userId" = 'YOUR-USER-ID-HERE'
GROUP BY cr.id, cr.name
ORDER BY unread_count DESC;

