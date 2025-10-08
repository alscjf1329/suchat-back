# 📁 Query Scripts

데이터베이스 관리를 위한 SQL 스크립트 모음입니다.

## 📄 파일 목록

### 1. `init.sql` - 초기화 (안전)
**용도**: 데이터베이스 전체 초기화

**포함 내용:**
- ✅ 모든 테이블 생성
- ✅ 인덱스 생성 (13개)
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

### 2. `drop-all.sql` - 테이블 삭제 ⚠️
**용도**: 모든 테이블과 데이터 삭제

**⚠️ 경고:**
- 🔴 **모든 데이터가 영구 삭제됩니다!**
- 🔴 프로덕션에서 절대 실행 금지!
- 🔴 개발/테스트 환경에서만 사용!

**삭제 내용:**
- messages
- chat_room_participants
- chat_rooms
- email_verifications
- users
- 모든 트리거/함수

**실행 방법:**
```bash
# pgAdmin에서
- drop-all.sql 실행
- 확인 후 init.sql 실행
```

---

### 3. `reset-database.sql` - 완전 리셋 (원클릭) ⚠️
**용도**: DROP + 재생성을 한 번에

**⚠️ 경고:**
- 🔴 모든 데이터 삭제 후 재생성
- 🔴 개발 환경 전용

**포함 내용:**
1. 모든 테이블 삭제
2. 테이블 재생성
3. 인덱스 생성
4. 트리거 설정
5. 테스트 데이터 생성

**장점:**
- ✅ 원클릭 리셋
- ✅ 깨끗한 상태로 시작
- ✅ 모든 최적화 적용

**실행 방법:**
```bash
# pgAdmin에서
- reset-database.sql 전체 실행 (1분 소요)
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

### 시나리오 4: 스키마만 재생성 ⚙️
```bash
1. pgAdmin에서 drop-all.sql 실행
2. pgAdmin에서 init.sql 실행
3. 백엔드 재시작
```

---

## ⚠️ 주의사항

### 🔴 절대 하지 마세요!
- **프로덕션**에서 drop-all.sql 실행
- **프로덕션**에서 reset-database.sql 실행
- 백업 없이 데이터 삭제

### ✅ 안전한 사용법
- 개발/테스트 환경에서만 사용
- 중요 데이터는 미리 백업
- pgAdmin에서 트랜잭션 사용 (BEGIN; ... ROLLBACK;)

---

## 📊 파일 비교

| 파일 | 용도 | 안전성 | 속도 |
|------|------|--------|------|
| `init.sql` | 초기 셋업 | 🟢 안전 | 빠름 |
| `drop-all.sql` | 테이블만 삭제 | 🔴 위험 | 즉시 |
| `reset-database.sql` | 완전 리셋 | 🔴 위험 | 1분 |

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
- chat_room_participants (신규)
- messages

### 인덱스 (총 13개)
- 성능 최적화를 위한 인덱스 자동 생성

---

**작성일**: 2025-10-07  
**버전**: 1.1.0  
**데이터베이스**: PostgreSQL 15

