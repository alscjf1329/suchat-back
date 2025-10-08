-- 안읽은 메시지 디버깅
-- roomId: 97cc6980-0ac8-446a-8f66-f5ad5f04de78
-- userId: e4c88bd6-1ca9-43ed-a4da-ee9fae741b05

-- 1. 해당 채팅방의 모든 메시지
SELECT id, content, timestamp 
FROM messages 
WHERE "roomId" = '97cc6980-0ac8-446a-8f66-f5ad5f04de78' 
ORDER BY timestamp;

-- 2. 읽은 메시지 ID 확인
SELECT "lastReadMessageId"
FROM chat_room_participants
WHERE "roomId" = '97cc6980-0ac8-446a-8f66-f5ad5f04de78' 
  AND "userId" = 'e4c88bd6-1ca9-43ed-a4da-ee9fae741b05';

-- 3. 안읽은 메시지 개수 계산
SELECT COUNT(*) as unread_count
FROM messages m
WHERE m."roomId" = '97cc6980-0ac8-446a-8f66-f5ad5f04de78'
  AND m.id > '7857d94c-0e71-47a0-8bc8-a35ceac0a20c';

-- 4. 안읽은 메시지 목록
SELECT id, content, timestamp
FROM messages m
WHERE m."roomId" = '97cc6980-0ac8-446a-8f66-f5ad5f04de78'
  AND m.id > '7857d94c-0e71-47a0-8bc8-a35ceac0a20c'
ORDER BY timestamp;

