# 푸시 알림 설정 가이드

SuChat의 푸시 알림 기능을 사용하기 위한 설정 가이드입니다.

## 📋 목차

1. [VAPID 키 생성](#1-vapid-키-생성)
2. [환경 변수 설정](#2-환경-변수-설정)
3. [서버 실행 및 테스트](#3-서버-실행-및-테스트)
4. [프론트엔드 설정](#4-프론트엔드-설정)
5. [푸시 알림 동작 방식](#5-푸시-알림-동작-방식)
6. [문제 해결](#6-문제-해결)

---

## 1. VAPID 키 생성

VAPID(Voluntary Application Server Identification) 키는 웹 푸시 알림을 위한 인증 키입니다.

### 백엔드 디렉토리에서 실행

```bash
cd suchat-back
npm run generate:vapid
```

### 출력 예시

```
🔑 VAPID 키 생성 중...

✅ VAPID 키 생성 완료!

======================================================================
백엔드 .env 파일에 다음 내용을 추가하세요:
======================================================================
VAPID_PUBLIC_KEY=BKxxx...xxx
VAPID_PRIVATE_KEY=xxx...xxx
VAPID_SUBJECT=mailto:admin@suchat.com
======================================================================

======================================================================
프론트엔드 .env.local 파일에 다음 내용을 추가하세요:
======================================================================
NEXT_PUBLIC_VAPID_KEY=BKxxx...xxx
======================================================================

⚠️  주의: 이 키들은 안전하게 보관하세요. 공개하지 마세요!
```

---

## 2. 환경 변수 설정

### 백엔드 (.env)

`suchat-back/.env` 파일에 다음 내용을 추가하세요:

```env
# Push Notifications (VAPID)
VAPID_PUBLIC_KEY=생성된_공개키
VAPID_PRIVATE_KEY=생성된_개인키
VAPID_SUBJECT=mailto:admin@suchat.com
```

### 프론트엔드 (.env.local)

`suchat-front/.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=http://localhost:3000

# Push Notifications (VAPID)
NEXT_PUBLIC_VAPID_KEY=생성된_공개키
```

⚠️ **주의**: 
- 프론트엔드에는 **공개키(VAPID_PUBLIC_KEY)만** 추가하세요
- 개인키(VAPID_PRIVATE_KEY)는 절대 프론트엔드에 노출하면 안 됩니다

---

## 3. 서버 실행 및 테스트

### 백엔드 서버 실행

```bash
cd suchat-back
npm run start:dev
```

서버가 시작되면 다음 로그를 확인하세요:

```
✅ Web Push initialized with VAPID
```

만약 다음 경고가 보인다면 환경 변수를 확인하세요:

```
⚠️  VAPID keys not configured. Push notifications disabled.
```

### 프론트엔드 개발 서버 실행

```bash
cd suchat-front
npm run dev
```

---

## 4. 프론트엔드 설정

### 자동 설정 (권장)

사용자가 로그인하면 자동으로 푸시 알림 권한을 요청합니다.

### 수동 설정

1. 로그인 후 **설정(⚙️)** 페이지로 이동
2. **알림(🔔)** 섹션 열기
3. **푸시 알림** 토글을 켜기
4. 브라우저에서 알림 권한 허용
5. **🧪 테스트 알림 보내기** 버튼을 클릭하여 테스트

---

## 5. 푸시 알림 동작 방식

### 메시지 수신 시

1. 사용자가 **오프라인**이거나 **채팅방에 접속하지 않은 상태**일 때
2. 다른 사용자가 메시지를 보내면
3. 백엔드가 푸시 알림 큐에 작업 추가
4. Bull Queue Processor가 푸시 알림 전송
5. Service Worker가 알림을 표시

### 알림 클릭 시

- 알림을 클릭하면 해당 채팅방으로 이동
- 이미 열린 창이 있으면 해당 창으로 포커스

---

## 6. 문제 해결

### 푸시 알림이 작동하지 않을 때

#### 1. 환경 변수 확인

```bash
# 백엔드
echo $VAPID_PUBLIC_KEY
echo $VAPID_PRIVATE_KEY

# 프론트엔드
echo $NEXT_PUBLIC_VAPID_KEY
```

#### 2. Service Worker 등록 확인

브라우저 개발자 도구에서:

1. **Application** 탭 열기
2. **Service Workers** 섹션 확인
3. `/sw.js`가 등록되어 있는지 확인
4. 상태가 **activated and is running**인지 확인

#### 3. 브라우저 알림 권한 확인

- Chrome: 설정 → 개인정보 보호 및 보안 → 사이트 설정 → 알림
- Firefox: 설정 → 개인정보 보호 및 보안 → 권한 → 알림
- Safari: 설정 → 웹사이트 → 알림

#### 4. 백엔드 로그 확인

```bash
# 푸시 알림 관련 로그 필터링
cd suchat-back
npm run start:dev | grep -i "push"
```

다음과 같은 로그를 확인하세요:

```
✅ Web Push initialized with VAPID
📬 Push job added: 123 for user: user-id
✅ Push sent to subscription: sub-id
```

#### 5. Redis 및 Bull Queue 확인

```bash
# Redis 연결 확인
redis-cli ping
# 응답: PONG

# Bull Queue 상태 확인 (Redis CLI)
redis-cli
> KEYS bull:push-notifications:*
```

#### 6. HTTPS 확인 (프로덕션)

푸시 알림은 **HTTPS**가 필요합니다 (localhost는 제외).

프로덕션 환경에서는 반드시 HTTPS를 사용하세요.

#### 7. 구독 상태 확인

브라우저 콘솔에서:

```javascript
// Service Worker 등록 확인
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('Service Worker:', reg);
  
  // 푸시 구독 확인
  reg.pushManager.getSubscription().then(sub => {
    console.log('Push Subscription:', sub);
  });
});
```

---

## 📚 관련 문서

- [Web Push Protocol](https://developers.google.com/web/fundamentals/push-notifications)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [web-push NPM Package](https://www.npmjs.com/package/web-push)
- [PWA_PUSH_GUIDE.md](./PWA_PUSH_GUIDE.md) - 상세 기술 문서

---

## 🔐 보안 주의사항

1. **VAPID 개인키는 절대 공개하지 마세요**
   - Git에 커밋하지 마세요 (.env 파일은 .gitignore에 포함)
   - 프론트엔드 코드에 포함하지 마세요
   - 로그에 출력하지 마세요

2. **환경 변수 관리**
   - 개발/스테이징/프로덕션 환경별로 다른 키 사용
   - 키 로테이션 계획 수립

3. **HTTPS 사용 (프로덕션)**
   - 푸시 알림은 HTTPS 필수
   - 유효한 SSL 인증서 사용

---

## ✅ 체크리스트

설정 완료 후 다음 항목을 확인하세요:

- [ ] VAPID 키 생성 완료
- [ ] 백엔드 .env에 VAPID 키 추가
- [ ] 프론트엔드 .env.local에 공개키 추가
- [ ] 백엔드 서버 시작 시 "Web Push initialized" 로그 확인
- [ ] Redis 및 PostgreSQL 실행 중
- [ ] 프론트엔드에서 로그인 성공
- [ ] 브라우저에서 알림 권한 허용
- [ ] 설정 페이지에서 푸시 알림 토글이 켜진 상태
- [ ] 테스트 알림 전송 성공
- [ ] 채팅 메시지 수신 시 푸시 알림 표시

---

## 🎉 완료!

이제 SuChat에서 푸시 알림을 사용할 수 있습니다!

문제가 발생하면 위의 [문제 해결](#6-문제-해결) 섹션을 참고하세요.

