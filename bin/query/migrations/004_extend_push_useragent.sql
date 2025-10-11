-- ========================================
-- 마이그레이션: push_subscriptions.userAgent 길이 확장
-- Version: 004  
-- Date: 2025-10-11
-- ========================================
--
-- 목적: userAgent 필드를 100자에서 500자로 확장
-- 이유: 일부 브라우저의 User-Agent 문자열이 100자를 초과함
--
-- 사용법:
-- Docker: Get-Content bin/query/migrations/004_extend_push_useragent.sql | docker compose exec -T postgres psql -U postgres -d suchat_db
--
-- ========================================

BEGIN;

-- userAgent 컬럼 길이 확장 (100 → 500)
ALTER TABLE push_subscriptions 
  ALTER COLUMN "userAgent" TYPE VARCHAR(500);

COMMIT;

-- 확인
SELECT 
  column_name, 
  data_type, 
  character_maximum_length
FROM information_schema.columns
WHERE table_name = 'push_subscriptions' 
  AND column_name = 'userAgent';

SELECT '✅ userAgent 컬럼 길이 확장 완료 (100 → 500)' as status;

