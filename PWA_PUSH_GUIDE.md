# 📱 PWA 푸시 알림 구현 가이드

SuChat의 PWA 푸시 알림 시스템이 성공적으로 구현되었습니다!

## 🎯 구현된 기능

### ✅ 백엔드 (NestJS)
- [x] Web Push 모듈 및 서비스
- [x] Bull Queue 기반 푸시 작업 처리 (데이터 소실 방지)
- [x] 구독 관리 API (등록/해제/조회)
- [x] 채팅 메시지 자동 푸시 연동
- [x] 오프라인 사용자 자동 감지
- [x] UPSERT 방식 구독 관리 (사용자당 1개)
- [x] gzip 압축 미들웨어
- [x] JWT 인증 완벽 통합

### ✅ 프론트엔드 (Next.js)
- [x] Service Worker 구현
- [x] 푸시 알림 유틸리티 함수
- [x] 설정 페이지 푸시 토글 UI
- [x] 테스트 알림 기능
- [x] Toast 알림 시스템 (alert 대체)
- [x] 성능 최적화 (GPU 가속, 메모이제이션)
- [x] 중복 구독 방지

---

## 🚀 사용 방법

### 1️⃣ 환경 변수 설정

#### 백엔드 (.env)
```env
# VAPID 키 생성
# 명령어: npx web-push generate-vapid-keys

VAPID_PUBLIC_KEY=생성된_Public_Key
VAPID_PRIVATE_KEY=생성된_Private_Key
VAPID_SUBJECT=mailto:admin@suchat.com

# 기타 필수 환경변수
JWT_SECRET=your_jwt_secret_key_here
DB_HOST=localhost
DB_PORT=5432
REDIS_HOST=localhost
REDIS_PORT=6379
```

#### 프론트엔드 (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_VAPID_KEY=생성된_Public_Key
NEXT_PUBLIC_WS_URL=http://localhost:8000
```

**⚠️ 중요**: 백엔드 포트는 8000입니다!

### 2️⃣ 데이터베이스 마이그레이션

푸시 구독 테이블 생성 (userId별 하나만 유지):

```bash
# 마이그레이션 실행
Get-Content bin/query/migrations/003_add_push_subscriptions.sql | docker compose -f bin/docker/docker-compose.yml exec -T postgres psql -U postgres -d suchat

# 또는 초기 설정 시
Get-Content bin/query/init.sql | docker compose -f bin/docker/docker-compose.yml exec -T postgres psql -U postgres -d suchat
```

**스키마 요약:**
```sql
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY,
  userId UUID NOT NULL UNIQUE,  -- 사용자당 하나만!
  endpoint TEXT NOT NULL,
  p256dh VARCHAR(255) NOT NULL,
  auth VARCHAR(255) NOT NULL,
  userAgent VARCHAR(500),  -- 500자로 확장
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

### 3️⃣ 서버 실행

**백엔드:**
```bash
cd suchat-back
npm run start:dev
```

**프론트엔드:**
```bash
cd suchat-front
npm run dev
```

**Redis & PostgreSQL:**
```bash
cd suchat-back/bin/docker
./start-db.sh
```

---

## 📋 API 엔드포인트

### 푸시 구독
```http
POST /push/subscribe
Authorization: Bearer {token}

{
  "endpoint": "https://...",
  "p256dh": "...",
  "auth": "...",
  "userAgent": "Mozilla/5.0..."
}
```

### 푸시 구독 해제
```http
DELETE /push/unsubscribe
Authorization: Bearer {token}

{
  "endpoint": "https://..."
}
```

### 테스트 푸시
```http
POST /push/test
Authorization: Bearer {token}
```

### 내 구독 목록
```http
GET /push/subscriptions
Authorization: Bearer {token}
```

---

## 🔔 푸시 알림 플로우

### 1. 사용자 구독
```
사용자 → 설정 페이지 → 푸시 알림 토글 ON
→ Service Worker 등록
→ 푸시 구독 생성
→ 서버에 구독 정보 전송
→ DB 저장
```

### 2. 메시지 발송 시 푸시
```
A 사용자 → 메시지 전송
→ ChatGateway에서 수신
→ 채팅방 참여자 조회
→ 오프라인 사용자 필터링
→ Bull Queue에 푸시 작업 추가 (Redis 저장)
→ PushProcessor 처리
→ Web Push 발송
→ 사용자 디바이스 알림 표시
```

### 3. 실패 시 재시도
```
푸시 발송 실패
→ Bull Queue 자동 재시도 (최대 3회)
→ 2초, 4초, 8초 간격 (exponential backoff)
→ 구독 만료(410, 404) 시 DB에서 비활성화
```

---

## 🛠️ 프론트엔드 사용법

### Service Worker 등록
```typescript
import { registerServiceWorker } from '@/lib/push';

const registration = await registerServiceWorker();
```

### 푸시 알림 초기화
```typescript
import { initializePushNotifications } from '@/lib/push';

const token = localStorage.getItem('accessToken'); // 주의: 'accessToken' 사용
const result = await initializePushNotifications(token);

if (result.success) {
  showToast('푸시 알림이 활성화되었습니다', 'success');
}
```

### 푸시 구독 해제
```typescript
import { unsubscribeFromPush, removeSubscriptionFromServer } from '@/lib/push';

const registration = await registerServiceWorker();
const subscription = await getPushSubscription(registration);

await removeSubscriptionFromServer(subscription, token);
await unsubscribeFromPush(registration);
```

---

## 🧪 테스트 방법

### 1. 브라우저에서 테스트

1. **프론트엔드 접속**
   ```
   http://localhost:3000
   ```

2. **회원가입 또는 로그인**
   ```
   회원가입 → 이메일 인증 → 로그인
   또는
   이메일: alscjf1329@gmail.com
   비밀번호: (사용자 비밀번호)
   ```

3. **설정 페이지 이동**
   ```
   하단 메뉴 → 설정 ⚙️ → 알림 섹션 펼치기 → 푸시 알림 토글 ON
   ```

4. **테스트 알림 발송**
   ```
   설정 → 알림 → 🧪 테스트 알림 보내기 버튼 클릭
   ```

5. **PC에서 테스트**
   - Chrome/Edge 권장 (PWA 지원)
   - 알림 권한 허용 필요
   - `requireInteraction: true` 설정으로 PC에서도 지속적으로 표시

### 2. 채팅 메시지 푸시 테스트

1. **브라우저 A**: 사용자 1 로그인 → 채팅방 입장
2. **브라우저 B**: 사용자 2 로그인 → 푸시 알림 활성화 → 브라우저 닫기
3. **브라우저 A**: 메시지 전송
4. **브라우저 B**: 푸시 알림 수신 확인 ✅

### 3. 큐 작업 모니터링

```bash
# Redis CLI
redis-cli

# Bull Queue 확인
KEYS bull:push-notifications:*

# 작업 상태 확인
HGETALL bull:push-notifications:1
```

---

## 🔍 트러블슈팅

### ❌ "Service Worker registration failed"
**원인**: HTTPS 필요 (localhost 제외)
**해결**: 
- 로컬 개발: `http://localhost` 사용
- 프로덕션: HTTPS 필수

### ❌ "Notification permission denied"
**원인**: 사용자가 알림 권한 거부
**해결**: 
- 브라우저 설정 → 사이트 설정 → 알림 → 허용

### ❌ "VAPID public key not configured"
**원인**: 환경변수 미설정
**해결**:
```bash
# VAPID 키 생성
npx web-push generate-vapid-keys

# .env에 추가
VAPID_PUBLIC_KEY=생성된_키
```

### ❌ "Push job failed"
**원인**: 구독 만료 또는 네트워크 오류
**해결**:
- Bull Queue가 자동 재시도
- 3회 실패 시 로그 확인
- 구독 재등록

### ❌ "No active subscriptions"
**원인**: 사용자가 푸시 구독하지 않음
**해결**:
- 사용자에게 푸시 알림 활성화 요청
- 설정 페이지에서 토글 ON

### ❌ "value too long for type character varying"
**원인**: User-Agent 문자열이 100자 초과
**해결**:
```bash
# userAgent 컬럼 길이 확장 마이그레이션 실행
Get-Content bin/query/migrations/004_extend_push_useragent.sql | docker compose -f bin/docker/docker-compose.yml exec -T postgres psql -U postgres -d suchat
```

### ❌ "401 Unauthorized" (JWT 인증 실패)
**원인**: 
- JWT_SECRET 환경변수 누락
- 토큰 만료
- localStorage에 잘못된 키 사용 ('token' vs 'accessToken')

**해결**:
1. `.env` 파일에 `JWT_SECRET` 설정 확인
2. 서버 재시작 (`npm run start:dev`)
3. 다시 로그인
4. `localStorage.getItem('accessToken')` 사용 확인

### ❌ 푸시 알림 API가 두 번 호출됨
**원인**: 브라우저가 기존 구독을 새로 생성
**해결**: ✅ 이미 해결됨
- `subscribeToPush`에서 기존 구독 재사용
- 백엔드에서 UPSERT 로직 구현

---

## 📊 데이터베이스 스키마

### push_subscriptions 테이블
```sql
┌──────────────┬──────────────┬──────────────────────────┐
│ 컬럼         │ 타입         │ 설명                     │
├──────────────┼──────────────┼──────────────────────────┤
│ id           │ UUID         │ 기본키                   │
│ userId       │ UUID         │ 사용자 ID (FK, UNIQUE)   │
│ endpoint     │ TEXT         │ 푸시 서버 URL            │
│ p256dh       │ VARCHAR(255) │ 암호화 공개키            │
│ auth         │ VARCHAR(255) │ 인증 시크릿              │
│ userAgent    │ VARCHAR(500) │ 디바이스 정보 (확장됨)   │
│ isActive     │ BOOLEAN      │ 활성화 상태              │
│ createdAt    │ TIMESTAMP    │ 생성 시간                │
│ updatedAt    │ TIMESTAMP    │ 수정 시간                │
└──────────────┴──────────────┴──────────────────────────┘

제약조건 및 인덱스:
- UNIQUE(userId) - 사용자당 하나의 구독만 허용
- INDEX(userId) - 조회 최적화
- INDEX(isActive) - 활성 구독만 필터링

**UPSERT 동작:**
- 새 디바이스에서 구독 시 기존 구독이 최신 정보로 업데이트됨
- 항상 가장 최근에 사용한 디바이스로 푸시 발송
```

---

## 🚀 프로덕션 배포 시 체크리스트

### 보안
- [ ] VAPID Private Key 환경변수로 관리 (코드에 하드코딩 금지)
- [ ] HTTPS 적용 (필수)
- [ ] CORS 설정 검토
- [ ] Rate Limiting 적용

### 성능
- [ ] Bull Queue 동시 처리 수 조정 (`concurrency: 5`)
- [ ] Redis 메모리 설정
- [ ] 푸시 작업 TTL 설정
- [ ] 만료된 구독 정기 정리

### 모니터링
- [ ] Bull Queue Dashboard 설정
- [ ] 푸시 발송 성공률 추적
- [ ] 에러 로그 수집
- [ ] 알림 전송 지연 모니터링

---

## 📚 참고 문서

- [Web Push Protocol](https://datatracker.ietf.org/doc/html/rfc8030)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Bull Queue](https://github.com/OptimalBits/bull)
- [web-push (npm)](https://www.npmjs.com/package/web-push)

---

## 🎉 완성!

PWA 푸시 알림 시스템이 완전히 구현되었습니다!

**주요 특징:**
✅ Bull Queue 기반 데이터 소실 방지
✅ 오프라인 사용자 자동 감지
✅ 실패 시 자동 재시도 (3회, exponential backoff)
✅ 구독 만료 자동 처리
✅ 테스트 알림 기능
✅ 사용자 친화적 설정 UI
✅ Toast 알림 시스템
✅ **사용자당 하나의 구독만 유지 (UPSERT)**
✅ PC 및 모바일 완벽 지원
✅ JWT 인증 완벽 통합
✅ gzip 압축으로 성능 최적화

**성능 최적화:**
- 🚀 gzip 압축: 60-80% 용량 감소
- ⚡ GPU 가속 애니메이션
- 📦 SWC Minification
- 🎨 Toast 깜빡임 제거
- 💾 정적 파일 캐싱

**마이그레이션 히스토리:**
- v003: push_subscriptions 테이블 생성
- v004: userAgent 길이 확장 (100 → 500)
- v005: userId UNIQUE 제약조건 (사용자당 1개)

**문의사항이나 버그는 GitHub Issues에 올려주세요!** 🐛

