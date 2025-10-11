# 📁 Query Scripts

데이터베이스 관리를 위한 SQL 스크립트 모음입니다.

## 📄 파일 목록 (총 3개 + 마이그레이션 5개)

### 1. `init.sql` - 초기화 🟢
**용도**: 데이터베이스 전체 초기화

**포함 내용:**
- ✅ 모든 테이블 생성 (8개)
- ✅ 인덱스 생성 (20개+)
- ✅ 트리거 설정
- ✅ 테스트 데이터 (사용자 10명)

**특징:**
- ✅ 멱등성 보장 (`IF NOT EXISTS`)
- ✅ 여러 번 실행해도 안전
- ✅ 기존 데이터 보존

**실행 방법:**
```bash
# pgAdmin (권장)
- http://localhost:8080 접속
- init.sql 내용 복사 후 실행
```

---

### 2. `reset-database.sql` - 완전 리셋 🔴
**용도**: DROP + 재생성을 한 번에

**⚠️ 경고:**
- 🔴 모든 데이터 삭제 후 재생성
- 🔴 개발 환경 전용

**포함 내용:**
1. 모든 테이블 삭제
2. 테이블 재생성
3. 인덱스 생성 (17개)
4. 트리거 설정
5. 테스트 데이터 생성

**장점:**
- ✅ 원클릭 완전 리셋
- ✅ 깨끗한 상태로 시작
- ✅ 모든 최적화 적용

**실행 방법:**
```bash
# pgAdmin에서
- reset-database.sql 전체 실행 (1분 소요)
```

---

### 3. `debug-queries.sql` - 디버깅 쿼리 모음 🔍
**용도**: 개발 중 문제 해결 및 상태 확인

**포함 쿼리:**
- 📊 테이블 통계
- 🐛 안읽은 메시지 디버깅
- 👥 친구 관계 확인
- 💬 채팅방 참여자 확인
- 📑 인덱스 확인
- ⏰ 최근 활동 확인
- 💾 데이터베이스 크기 확인

**사용법:**
```bash
# 필요한 쿼리만 복사해서 실행
# 주석을 해제하고 ID 값을 변경하여 사용
```

---

## 🎯 사용 시나리오

### 시나리오 1: 새 개발 환경 셋업 ✨
```bash
1. Docker 컨테이너 시작: npm run docker:start
2. pgAdmin에서 init.sql 실행
3. 백엔드 시작: npm run start:dev
```

### 시나리오 2: 빠른 데이터베이스 리셋 🔥
```bash
1. pgAdmin에서 reset-database.sql 실행 (원클릭)
2. 백엔드 재시작: npm run start:dev
```

### 시나리오 3: 완전 초기화 (Docker 포함) 🔄
```bash
1. npm run docker:clean (Docker 볼륨 삭제)
2. npm run docker:start (Docker 재시작)
3. pgAdmin에서 init.sql 실행
4. npm run start:dev
```

### 시나리오 4: 문제 디버깅 🐛
```bash
1. pgAdmin에서 debug-queries.sql 열기
2. 필요한 쿼리 복사 (주석 해제)
3. ID 값 변경 후 실행
4. 결과 확인
```

---

## ⚠️ 주의사항

### 🔴 절대 하지 마세요!
- **프로덕션**에서 reset-database.sql 실행
- 백업 없이 데이터 삭제
- 운영 환경에서 디버그 쿼리 실행

### ✅ 안전한 사용법
- 개발/테스트 환경에서만 사용
- 중요 데이터는 미리 백업
- pgAdmin에서 트랜잭션 사용 (BEGIN; ... ROLLBACK;)

---

## 📊 파일 비교

| 파일 | 용도 | 안전성 | 실행 시간 |
|------|------|--------|---------|
| `init.sql` | 초기 셋업 | 🟢 안전 | ~10초 |
| `reset-database.sql` | 완전 리셋 | 🔴 위험 | ~1분 |
| `debug-queries.sql` | 디버깅 | 🟢 안전 | 즉시 |

---

## 📊 생성되는 데이터

### 테스트 사용자 (10명)
- 이메일: kim@example.com ~ lim@example.com
- 비밀번호: password123 (모두 동일)
- 상태: 활성화됨

### 테이블 구조
- users
- email_verifications
- chat_rooms
- chat_room_participants
- messages
- friends
- refresh_tokens
- push_subscriptions (신규 - PWA 푸시 알림)

### 인덱스 (총 20개+)
- 성능 최적화를 위한 인덱스 자동 생성
- 친구 조회 최적화 인덱스 포함
- 푸시 구독 조회 최적화 인덱스 포함

---

## 🚀 빠른 시작

```bash
# 1. 처음 시작하는 경우
pgAdmin에서 init.sql 실행

# 2. 문제가 생겨서 완전히 리셋하고 싶은 경우
pgAdmin에서 reset-database.sql 실행

# 3. 버그 디버깅이 필요한 경우
pgAdmin에서 debug-queries.sql의 필요한 부분만 실행
```

---

## 📂 마이그레이션 (migrations/)

### 001, 002 - 기본 스키마
- 채팅방 최적화
- 친구 시스템

### 003 - 푸시 알림 구독 테이블 추가
```bash
Get-Content bin/query/migrations/003_add_push_subscriptions.sql | docker compose -f bin/docker/docker-compose.yml exec -T postgres psql -U postgres -d suchat
```

### 004 - userAgent 길이 확장 (100 → 500)
```bash
Get-Content bin/query/migrations/004_extend_push_useragent.sql | docker compose -f bin/docker/docker-compose.yml exec -T postgres psql -U postgres -d suchat
```

### 005 - userId UNIQUE 제약조건
```bash
Get-Content bin/query/migrations/005_push_userid_unique.sql | docker compose -f bin/docker/docker-compose.yml exec -T postgres psql -U postgres -d suchat
```

---

**작성일**: 2025-10-11  
**버전**: 3.0.0  
**데이터베이스**: PostgreSQL 15  
**쿼리 파일**: 3개  
**마이그레이션**: 5개

