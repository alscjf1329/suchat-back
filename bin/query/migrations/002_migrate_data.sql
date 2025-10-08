-- 기존 채팅방 참여자 데이터 마이그레이션
-- pgAdmin 또는 DBeaver에서 실행하세요

-- 1. participants 배열을 chat_room_participants로 이동
INSERT INTO chat_room_participants ("roomId", "userId", role, "joinedAt")
SELECT 
  cr.id::UUID,
  unnest(cr.participants)::UUID,
  'member',
  cr."createdAt"
FROM chat_rooms cr
WHERE array_length(cr.participants, 1) > 0
ON CONFLICT ("roomId", "userId") DO NOTHING;

-- 2. 첫 번째 참여자를 owner로 변경
UPDATE chat_room_participants crp
SET role = 'owner'
WHERE (crp."roomId", crp."joinedAt") IN (
  SELECT "roomId", MIN("joinedAt")
  FROM chat_room_participants
  GROUP BY "roomId"
);

-- 확인
SELECT 
  cr.name,
  COUNT(crp."userId") as participant_count,
  STRING_AGG(u.name, ', ') as participants
FROM chat_rooms cr
LEFT JOIN chat_room_participants crp ON crp."roomId" = cr.id
LEFT JOIN users u ON u.id = crp."userId"
GROUP BY cr.id, cr.name
ORDER BY cr."createdAt" DESC;

