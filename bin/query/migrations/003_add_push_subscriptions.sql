-- ========================================
-- 마이그레이션: 푸시 알림 구독 테이블 추가
-- Version: 003
-- Date: 2025-10-11
-- ========================================
--
-- 목적: PWA 푸시 알림 기능을 위한 구독 정보 저장
-- 특징: userId별 하나의 구독만 유지 (최신 디바이스로 업데이트)
--
-- 사용법:
-- Docker: Get-Content bin/query/migrations/003_add_push_subscriptions.sql | docker compose -f bin/docker/docker-compose.yml exec -T postgres psql -U postgres -d suchat
--
-- ========================================

BEGIN;

-- 1. 테이블 생성
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL UNIQUE,  -- UNIQUE: 사용자당 하나의 구독만
  endpoint TEXT NOT NULL,
  p256dh VARCHAR(255) NOT NULL,
  auth VARCHAR(255) NOT NULL,
  "userAgent" VARCHAR(500),  -- User-Agent 문자열 (최대 500자)
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

-- 2. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user 
  ON push_subscriptions("userId");

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active 
  ON push_subscriptions("isActive") WHERE "isActive" = true;

-- 3. 트리거 생성 (updatedAt 자동 갱신)
DROP TRIGGER IF EXISTS update_push_subscriptions_updated_at ON push_subscriptions;
CREATE TRIGGER update_push_subscriptions_updated_at 
  BEFORE UPDATE ON push_subscriptions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 4. 통계 수집
ANALYZE push_subscriptions;

COMMIT;

-- 확인
SELECT 
  'push_subscriptions' as table_name, 
  COUNT(*) as count 
FROM push_subscriptions;

SELECT '✅ 푸시 알림 구독 테이블 마이그레이션 완료!' as status;

