-- Suchat Database 초기화 스크립트

-- 데이터베이스 생성 (이미 docker-compose에서 생성됨)
-- CREATE DATABASE suchat;

-- UUID 확장 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 채팅방 테이블
CREATE TABLE IF NOT EXISTS chat_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    participants TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 메시지 테이블
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'text' CHECK (type IN ('text', 'image', 'video', 'file')),
    file_url VARCHAR(500),
    file_name VARCHAR(255),
    file_size BIGINT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_participants ON chat_rooms USING GIN(participants);

-- 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 채팅방 업데이트 트리거
CREATE TRIGGER update_chat_rooms_updated_at 
    BEFORE UPDATE ON chat_rooms 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 샘플 데이터 삽입
INSERT INTO chat_rooms (id, name, description, participants) VALUES 
    ('550e8400-e29b-41d4-a716-446655440000', '일반 채팅', '자유롭게 대화하는 공간', ARRAY['user1', 'user2']),
    ('550e8400-e29b-41d4-a716-446655440001', '개발팀', '개발 관련 논의', ARRAY['dev1', 'dev2', 'dev3'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO messages (room_id, user_id, content, type) VALUES 
    ('550e8400-e29b-41d4-a716-446655440000', 'user1', '안녕하세요!', 'text'),
    ('550e8400-e29b-41d4-a716-446655440000', 'user2', '반갑습니다!', 'text'),
    ('550e8400-e29b-41d4-a716-446655440001', 'dev1', '오늘 코드 리뷰 언제 하나요?', 'text')
ON CONFLICT DO NOTHING;
