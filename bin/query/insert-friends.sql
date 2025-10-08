-- UTF-8 인코딩으로 저장된 임시 친구 데이터
INSERT INTO users (id, name, email, password, phone, birthday, "isActive", "lastLoginAt", "createdAt", "updatedAt") VALUES
  ('e5f3c8a0-1234-4567-89ab-000000000001', '김철수', 'kim@example.com', '$2b$10$rK5qZ.VqQxWJh1YkLGZJK.N8YGZqZ5mJZ5qZ5qZ5qZ5qZ5qZ5qZ5qO', '010-1111-1111', '1990-01-15', true, NOW(), NOW(), NOW()),
  ('e5f3c8a0-1234-4567-89ab-000000000002', '이영희', 'lee@example.com', '$2b$10$rK5qZ.VqQxWJh1YkLGZJK.N8YGZqZ5mJZ5qZ5qZ5qZ5qZ5qZ5qZ5qO', '010-2222-2222', '1992-03-20', true, NOW(), NOW(), NOW()),
  ('e5f3c8a0-1234-4567-89ab-000000000003', '박민수', 'park@example.com', '$2b$10$rK5qZ.VqQxWJh1YkLGZJK.N8YGZqZ5mJZ5qZ5qZ5qZ5qZ5qZ5qZ5qO', '010-3333-3333', '1988-07-10', true, NOW(), NOW(), NOW()),
  ('e5f3c8a0-1234-4567-89ab-000000000004', '정수진', 'jung@example.com', '$2b$10$rK5qZ.VqQxWJh1YkLGZJK.N8YGZqZ5mJZ5qZ5qZ5qZ5qZ5qZ5qZ5qO', '010-4444-4444', '1995-11-25', true, NOW(), NOW(), NOW()),
  ('e5f3c8a0-1234-4567-89ab-000000000005', '최동현', 'choi@example.com', '$2b$10$rK5qZ.VqQxWJh1YkLGZJK.N8YGZqZ5mJZ5qZ5qZ5qZ5qZ5qZ5qZ5qO', '010-5555-5555', '1991-05-08', true, NOW(), NOW(), NOW()),
  ('e5f3c8a0-1234-4567-89ab-000000000006', '한지영', 'han@example.com', '$2b$10$rK5qZ.VqQxWJh1YkLGZJK.N8YGZqZ5mJZ5qZ5qZ5qZ5qZ5qZ5qZ5qO', '010-6666-6666', '1993-09-17', true, NOW(), NOW(), NOW()),
  ('e5f3c8a0-1234-4567-89ab-000000000007', '강민호', 'kang@example.com', '$2b$10$rK5qZ.VqQxWJh1YkLGZJK.N8YGZqZ5mJZ5qZ5qZ5qZ5qZ5qZ5qZ5qO', '010-7777-7777', '1989-12-30', true, NOW(), NOW(), NOW()),
  ('e5f3c8a0-1234-4567-89ab-000000000008', '윤서연', 'yoon@example.com', '$2b$10$rK5qZ.VqQxWJh1YkLGZJK.N8YGZqZ5mJZ5qZ5qZ5qZ5qZ5qZ5qZ5qO', '010-8888-8888', '1994-04-22', true, NOW(), NOW(), NOW()),
  ('e5f3c8a0-1234-4567-89ab-000000000009', '조현우', 'jo@example.com', '$2b$10$rK5qZ.VqQxWJh1YkLGZJK.N8YGZqZ5mJZ5qZ5qZ5qZ5qZ5qZ5qZ5qO', '010-9999-9999', '1987-06-14', true, NOW(), NOW(), NOW()),
  ('e5f3c8a0-1234-4567-89ab-000000000010', '임수빈', 'lim@example.com', '$2b$10$rK5qZ.VqQxWJh1YkLGZJK.N8YGZqZ5mJZ5qZ5qZ5qZ5qZ5qZ5qZ5qO', '010-1010-1010', '1996-08-05', true, NOW(), NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

SELECT id, name, email FROM users WHERE email LIKE '%@example.com' ORDER BY name;

