-- 여러 파일 지원을 위한 메시지 테이블 수정
-- 날짜: 2025-01-27

-- 1. 기존 CHECK 제약조건 제거
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_type_check;

-- 2. 새로운 CHECK 제약조건 추가 ('images' 포함)
ALTER TABLE messages 
ADD CONSTRAINT messages_type_check 
CHECK (type IN ('text', 'image', 'video', 'file', 'images'));

-- 3. 여러 파일을 위한 JSON 필드 추가
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS files JSON;

-- 4. 기존 데이터 마이그레이션 (단일 파일을 files 배열로 변환)
UPDATE messages 
SET files = json_build_array(
  json_build_object(
    'fileUrl', "fileUrl",
    'fileName', "fileName",
    'fileSize', "fileSize"
  )
)
WHERE "fileUrl" IS NOT NULL 
  AND files IS NULL;

-- 5. 인덱스 추가 (JSON 필드 검색용)
CREATE INDEX IF NOT EXISTS idx_messages_files_gin 
ON messages USING GIN (files);

-- 6. 코멘트 추가
COMMENT ON COLUMN messages.files IS '여러 파일 정보를 저장하는 JSON 배열 (type이 images일 때 사용)';
COMMENT ON COLUMN messages.type IS '메시지 타입: text, image, video, file, images(여러 이미지)';

-- 7. 완료 메시지
SELECT '✅ 메시지 테이블 여러 파일 지원 추가 완료!' as status;
