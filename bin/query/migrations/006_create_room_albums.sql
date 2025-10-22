-- 채팅방 사진첩 폴더 및 사진 테이블 생성
-- 작성일: 2025-10-22
-- 설명: 채팅방 멤버들이 공유하는 사진/동영상을 폴더별로 관리

-- 1. 폴더 테이블 생성 (트리 구조 지원)
CREATE TABLE IF NOT EXISTS room_album_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "roomId" UUID NOT NULL,
  "parentId" UUID,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  "createdBy" UUID NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  CONSTRAINT fk_room_album_folders_room FOREIGN KEY ("roomId") 
    REFERENCES chat_rooms(id) ON DELETE CASCADE,
  CONSTRAINT fk_room_album_folders_user FOREIGN KEY ("createdBy") 
    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_room_album_folders_parent FOREIGN KEY ("parentId") 
    REFERENCES room_album_folders(id) ON DELETE CASCADE
);

-- 2. 사진첩 테이블 생성
CREATE TABLE IF NOT EXISTS room_albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "roomId" UUID NOT NULL,
  "folderId" UUID,
  "uploadedBy" UUID NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('image', 'video')),
  "fileUrl" VARCHAR(500) NOT NULL,
  "thumbnailUrl" VARCHAR(500),
  "fileName" VARCHAR(255) NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "uploadedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  CONSTRAINT fk_room_albums_room FOREIGN KEY ("roomId") 
    REFERENCES chat_rooms(id) ON DELETE CASCADE,
  CONSTRAINT fk_room_albums_user FOREIGN KEY ("uploadedBy") 
    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_room_albums_folder FOREIGN KEY ("folderId") 
    REFERENCES room_album_folders(id) ON DELETE SET NULL
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_room_albums_room_time 
  ON room_albums("roomId", "uploadedAt" DESC);

CREATE INDEX IF NOT EXISTS idx_room_albums_folder 
  ON room_albums("folderId");

CREATE INDEX IF NOT EXISTS idx_room_albums_uploader 
  ON room_albums("uploadedBy");

CREATE INDEX IF NOT EXISTS idx_room_album_folders_room 
  ON room_album_folders("roomId");

CREATE INDEX IF NOT EXISTS idx_room_album_folders_parent 
  ON room_album_folders("parentId");

-- 코멘트 추가
COMMENT ON TABLE room_album_folders IS '사진첩 폴더';
COMMENT ON TABLE room_albums IS '채팅방 사진첩 - 멤버들이 공유한 사진/동영상';

-- 성공 메시지
DO $$
BEGIN
  RAISE NOTICE '✅ 사진첩 테이블 생성 완료 (폴더 기능 포함)';
END $$;

