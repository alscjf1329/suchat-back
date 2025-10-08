-- 안읽은 메시지 확인 쿼리
-- roomId: 97cc6980-0ac8-446a-8f66-f5ad5f04de78
-- userId: e4c88bd6-1ca9-43ed-a4da-ee9fae741b05
-- lastReadMessageId: 7857d94c-0e71-47a0-8bc8-a35ceac0a20c

-- 1. 모든 메시지
SELECT 
  id, 
  content, 
  timestamp,
  CASE 
    WHEN timestamp > (SELECT timestamp FROM messages WHERE id = '7857d94c-0e71-47a0-8bc8-a35ceac0a20c')
    THEN '안읽음 ⭕'
    ELSE '읽음 ✅'
  END as status
FROM messages 
WHERE "roomId" = '97cc6980-0ac8-446a-8f66-f5ad5f04de78' 
ORDER BY timestamp;

-- 2. 안읽은 메시지 개수 (timestamp + id 복합 비교)
SELECT COUNT(*) as unread_count
FROM messages m
WHERE m."roomId" = '97cc6980-0ac8-446a-8f66-f5ad5f04de78'
  AND (m.timestamp, m.id) > (
    SELECT timestamp, id
    FROM messages 
    WHERE id = '7857d94c-0e71-47a0-8bc8-a35ceac0a20c'
  );

-- 3. 복합 비교 설명
-- (timestamp, id) > (t1, id1) 의미:
-- 1) timestamp > t1 이면 TRUE
-- 2) timestamp = t1 이고 id > id1 이면 TRUE
-- 3) 그 외 FALSE
-- → 같은 시간의 메시지도 정확히 구분!

