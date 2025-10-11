-- ========================================
-- 마이그레이션: push_subscriptions userId UNIQUE 제약조건
-- Version: 005
-- Date: 2025-10-11
-- ========================================
--
-- 목적: userId별로 하나의 구독만 유지하도록 변경
-- 변경사항:
--   1. (userId, endpoint) UNIQUE 인덱스 삭제
--   2. userId UNIQUE 제약조건 추가
--   3. 중복 데이터 정리 (최신 것만 유지)
--
-- 사용법:
-- Docker: Get-Content bin/query/migrations/005_push_userid_unique.sql | docker compose -f bin/docker/docker-compose.yml exec -T postgres psql -U postgres -d suchat
--
-- ========================================

BEGIN;

-- 1. 중복 데이터 정리 (userId별 최신 데이터만 유지)
DELETE FROM push_subscriptions
WHERE id NOT IN (
  SELECT DISTINCT ON ("userId") id
  FROM push_subscriptions
  ORDER BY "userId", "updatedAt" DESC
);

-- 2. 기존 UNIQUE 인덱스 삭제
DROP INDEX IF EXISTS idx_push_subscriptions_user_endpoint;

-- 3. userId에 UNIQUE 제약조건 추가
ALTER TABLE push_subscriptions 
  ADD CONSTRAINT push_subscriptions_userId_unique UNIQUE ("userId");

-- 4. 통계 수집
ANALYZE push_subscriptions;

COMMIT;

-- 확인
SELECT 
  "userId", 
  COUNT(*) as subscription_count
FROM push_subscriptions 
GROUP BY "userId"
HAVING COUNT(*) > 1;

-- 결과가 없으면 성공
SELECT '✅ userId UNIQUE 제약조건 적용 완료!' as status;
SELECT COUNT(*) as total_subscriptions FROM push_subscriptions;

