-- ========================================
-- SuChat 데이터베이스 전체 초기화 (DROP ALL)
-- ⚠️ 주의: 모든 데이터가 삭제됩니다!
-- ========================================
-- 
-- 사용법:
-- pgAdmin 또는 DBeaver에서 실행하세요
-- 
-- ⚠️ 이 스크립트는 모든 테이블과 데이터를 삭제합니다!
-- ⚠️ 프로덕션 환경에서는 절대 실행하지 마세요!
--
-- ========================================

-- ========================================
-- 1. 모든 테이블 삭제 (CASCADE)
-- ========================================

-- 순서 중요: FK 의존성 때문에 역순으로 삭제

-- 1.1 메시지 테이블 삭제
DROP TABLE IF EXISTS messages CASCADE;
COMMENT ON TABLE messages IS '메시지 테이블 삭제됨';

-- 1.2 채팅방 참여자 테이블 삭제
DROP TABLE IF EXISTS chat_room_participants CASCADE;
COMMENT ON TABLE chat_room_participants IS '참여자 테이블 삭제됨';

-- 1.3 채팅방 테이블 삭제
DROP TABLE IF EXISTS chat_rooms CASCADE;
COMMENT ON TABLE chat_rooms IS '채팅방 테이블 삭제됨';

-- 1.4 이메일 인증 테이블 삭제
DROP TABLE IF EXISTS email_verifications CASCADE;
COMMENT ON TABLE email_verifications IS '이메일 인증 테이블 삭제됨';

-- 1.5 사용자 테이블 삭제
DROP TABLE IF EXISTS users CASCADE;
COMMENT ON TABLE users IS '사용자 테이블 삭제됨';

-- ========================================
-- 2. 트리거 함수 삭제
-- ========================================

DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ========================================
-- 3. 확인
-- ========================================

-- 남은 테이블 확인 (비어있어야 정상)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- ========================================
-- 완료 메시지
-- ========================================

SELECT '✅ 모든 테이블이 삭제되었습니다!' as status;
SELECT '🔄 다음 단계: bin/query/init.sql을 실행하여 재생성하세요' as next_step;

-- ========================================
-- 빠른 재시작 가이드
-- ========================================
/*

전체 리셋 순서:

1. 이 파일(drop-all.sql) 실행 → 모든 테이블 삭제
2. bin/query/init.sql 실행 → 테이블 재생성 + 테스트 데이터
3. 백엔드 재시작: npm run start:dev

*/

