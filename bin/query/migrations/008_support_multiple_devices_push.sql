-- ========================================
-- 마이그레이션: 여러 기기 지원을 위한 푸시 구독 테이블 수정
-- Version: 008
-- Date: 2025-01-XX
-- ========================================
--
-- 목적: 사용자가 여러 기기(iOS, Android, Desktop, Tablet)에서 푸시 알림을 받을 수 있도록 지원
-- 변경사항:
--   1. userId UNIQUE 제약조건 제거
--   2. deviceId, deviceType, deviceName 컬럼 추가
--   3. (userId, deviceId) 조합으로 UNIQUE 제약조건 추가
--   4. deviceId 인덱스 추가
--
-- 사용법:
-- Docker: Get-Content bin/query/migrations/008_support_multiple_devices_push.sql | docker compose -f bin/docker/docker-compose.yml exec -T postgres psql -U postgres -d suchat
--
-- ========================================

BEGIN;

-- 1. 기존 userId UNIQUE 제약조건 제거
ALTER TABLE push_subscriptions 
  DROP CONSTRAINT IF EXISTS push_subscriptions_userId_unique;

-- 2. 새 컬럼 추가
ALTER TABLE push_subscriptions 
  ADD COLUMN IF NOT EXISTS "deviceId" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "deviceType" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "deviceName" VARCHAR(255);

-- 3. 기존 데이터에 대한 deviceId 생성 (endpoint 기반)
UPDATE push_subscriptions
SET 
  "deviceId" = 'device_' || SUBSTRING(MD5(endpoint), 1, 16) || '_' || EXTRACT(EPOCH FROM "createdAt")::BIGINT,
  "deviceType" = CASE 
    WHEN "userAgent" ILIKE '%iphone%' OR "userAgent" ILIKE '%ipod%' THEN 'ios'
    WHEN "userAgent" ILIKE '%ipad%' THEN 'tablet'
    WHEN "userAgent" ILIKE '%android%' THEN 
      CASE 
        WHEN "userAgent" NOT ILIKE '%mobile%' THEN 'tablet'
        ELSE 'android'
      END
    ELSE 'desktop'
  END,
  "deviceName" = COALESCE("userAgent", 'Unknown Device')
WHERE "deviceId" IS NULL;

-- 4. deviceId NOT NULL 제약조건 추가
ALTER TABLE push_subscriptions 
  ALTER COLUMN "deviceId" SET NOT NULL,
  ALTER COLUMN "deviceType" SET NOT NULL;

-- 5. (userId, deviceId) 조합으로 UNIQUE 제약조건 추가
ALTER TABLE push_subscriptions 
  ADD CONSTRAINT push_subscriptions_userId_deviceId_unique 
  UNIQUE ("userId", "deviceId");

-- 6. deviceId 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_deviceId 
  ON push_subscriptions("deviceId");

-- 7. deviceType 인덱스 추가 (선택사항, 통계용)
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_deviceType 
  ON push_subscriptions("deviceType");

-- 8. 통계 수집
ANALYZE push_subscriptions;

COMMIT;

-- 확인
SELECT 
  "deviceType",
  COUNT(*) as count
FROM push_subscriptions 
GROUP BY "deviceType"
ORDER BY count DESC;

SELECT 
  "userId",
  COUNT(*) as device_count
FROM push_subscriptions 
GROUP BY "userId"
ORDER BY device_count DESC
LIMIT 10;

SELECT '✅ 여러 기기 지원 마이그레이션 완료!' as status;
SELECT COUNT(*) as total_subscriptions FROM push_subscriptions;

