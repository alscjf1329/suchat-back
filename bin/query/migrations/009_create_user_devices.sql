-- ========================================
-- 마이그레이션: 사용자 기기 관리 테이블 생성
-- Version: 009
-- Date: 2025-01-XX
-- ========================================
--
-- 목적: 푸시 구독과 분리된 독립적인 기기 관리 시스템
-- 변경사항:
--   1. user_devices 테이블 생성
--   2. 사용자별 여러 기기 지원
--   3. 로그인 시 기기 정보 자동 저장
--
-- 사용법:
-- Docker: Get-Content bin/query/migrations/009_create_user_devices.sql | docker compose -f bin/docker/docker-compose.yml exec -T postgres psql -U postgres -d suchat
--
-- ========================================

BEGIN;

-- 1. user_devices 테이블 생성
CREATE TABLE IF NOT EXISTS user_devices (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "deviceId" VARCHAR(255) NOT NULL,
  "deviceType" VARCHAR(50) NOT NULL, -- 'ios', 'android', 'desktop', 'tablet'
  "deviceName" VARCHAR(255),
  "userAgent" VARCHAR(500),
  "lastLoginAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- 외래키 제약조건
  CONSTRAINT "FK_user_devices_userId" 
    FOREIGN KEY ("userId") 
    REFERENCES users("id") 
    ON DELETE CASCADE,
  
  -- 고유 제약조건: 사용자별 기기 ID는 고유해야 함
  CONSTRAINT "UQ_user_devices_userId_deviceId" 
    UNIQUE ("userId", "deviceId")
);

-- 2. 인덱스 생성
CREATE INDEX IF NOT EXISTS "IDX_user_devices_userId" 
  ON user_devices("userId");
  
CREATE INDEX IF NOT EXISTS "IDX_user_devices_deviceId" 
  ON user_devices("deviceId");
  
CREATE INDEX IF NOT EXISTS "IDX_user_devices_lastLoginAt" 
  ON user_devices("lastLoginAt" DESC);

-- 3. updatedAt 자동 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_user_devices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. 트리거 생성
DROP TRIGGER IF EXISTS trigger_update_user_devices_updated_at ON user_devices;
CREATE TRIGGER trigger_update_user_devices_updated_at
  BEFORE UPDATE ON user_devices
  FOR EACH ROW
  EXECUTE FUNCTION update_user_devices_updated_at();

COMMIT;

-- ========================================
-- 완료 메시지
-- ========================================
SELECT '✅ user_devices 테이블이 성공적으로 생성되었습니다.' AS result;

