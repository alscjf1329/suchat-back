# Nginx 파일 업로드 설정 가이드

## 🔴 문제 상황

```
프론트엔드: https://yourdomain.com (포트 443)
백엔드:     https://yourdomain.com:8000 (포트 8000)

→ 포트가 다름 = 다른 Origin = CORS 필요
→ 파일 업로드 실패
```

---

## 📊 Nginx 설정 변경 비교

### ❌ 기존 설정 (문제)

```nginx
server {
    listen 8000 ssl;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://localhost:8080;  # ← 포트 확인 필요!
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**문제점:**
1. ❌ 파일 크기 제한 없음 (기본 1MB) → 큰 파일 업로드 실패
2. ❌ 타임아웃 짧음 (기본 60초) → 큰 파일 업로드 시간 초과
3. ⚠️ proxy_pass 포트가 백엔드와 다를 수 있음

---

### ✅ 수정된 설정 (해결)

```nginx
server {
    listen 8000 ssl;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # ✅ 추가 1: 파일 업로드 크기 제한 (100MB)
    client_max_body_size 100M;

    location / {
        # ✅ 추가 2: 백엔드가 CORS 처리하므로 Nginx에서는 불필요
        # (백엔드 main.ts에 app.enableCors가 있음)
        
        # ✅ 수정 3: 백엔드 실제 포트로 변경 (8080 → 8000)
        proxy_pass http://localhost:8000;  # PM2 로그에서 확인한 포트
        
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # ✅ 추가 4: 파일 업로드를 위한 타임아웃 증가 (300초 = 5분)
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        proxy_read_timeout 300;
    }
}
```

---

## 📝 변경 사항 요약

| 항목 | 기존 | 수정 | 이유 |
|------|------|------|------|
| **파일 크기 제한** | 1MB (기본값) | 100MB | 이미지/동영상 업로드 가능하게 |
| **proxy_pass 포트** | 8080 | 8000 | 백엔드 실제 실행 포트에 맞춤 |
| **타임아웃** | 60초 (기본) | 300초 | 큰 파일 업로드 시간 확보 |
| **추가 헤더** | 없음 | X-Real-IP 등 | 클라이언트 IP 전달 |

---

## 🔍 핵심 포인트

### 1. `client_max_body_size 100M`
```nginx
client_max_body_size 100M;
```
- **없으면:** 1MB 이상 파일 업로드 시 `413 Request Entity Too Large` 에러
- **추가하면:** 100MB까지 업로드 가능

---

### 2. `proxy_pass` 포트
```nginx
proxy_pass http://localhost:8000;  # 백엔드 실제 포트
```

**포트 확인 방법:**
```bash
pm2 logs suchat-backend --lines 5
```

출력:
```
🚀 서버가 http://localhost:8000에서 실행 중입니다.
                             ^^^^
                             이 포트!
```

- **포트가 틀리면:** 404 Not Found
- **포트가 맞으면:** 정상 동작

---

### 3. 타임아웃 설정
```nginx
proxy_connect_timeout 300;  # 연결 타임아웃
proxy_send_timeout 300;     # 요청 전송 타임아웃
proxy_read_timeout 300;     # 응답 대기 타임아웃
```

- **없으면:** 60초 후 `504 Gateway Timeout`
- **추가하면:** 5분까지 기다림 (큰 파일 업로드 가능)

---

## 🎯 적용 방법

### 1단계: 백엔드 포트 확인
```bash
pm2 logs suchat-backend --lines 5
```

### 2단계: Nginx 설정 수정
```bash
sudo nano /etc/nginx/sites-available/yourdomain.com
```

위의 "✅ 수정된 설정" 내용으로 8000번 포트 블록을 교체

**중요:** `proxy_pass http://localhost:XXXX;`의 XXXX를 1단계에서 확인한 포트로 변경!

### 3단계: 적용
```bash
# 설정 테스트
sudo nginx -t

# 재시작
sudo systemctl reload nginx
```

---

## ✅ 테스트

### 서버에서:
```bash
# Nginx를 통한 업로드 테스트
curl -X POST https://yourdomain.com:8000/file/upload \
  -F "file=@test.jpg" \
  -F "userId=test-uuid" \
  -F "roomId=test-uuid" \
  -v
```

### 브라우저에서:
1. F12 → Network 탭
2. 파일 업로드 시도
3. Status Code 확인:
   - ✅ `200 OK` 또는 `400 Bad Request` (정상 도달)
   - ❌ `413` (파일 크기 제한)
   - ❌ `504` (타임아웃)
   - ❌ `404` (포트 틀림)

---

## 🔄 전체 흐름

### 파일 업로드 요청 흐름:

```
브라우저
  ↓
https://yourdomain.com:8000/file/upload (HTTPS, Nginx)
  ↓
Nginx (SSL 종료, CORS는 건너뜀)
  ↓
http://localhost:8000/file/upload (HTTP, NestJS 백엔드)
  ↓
백엔드가 CORS 처리 (app.enableCors)
  ↓
파일 저장 → /var/www/your-project/uploads/
```

---

## 🚨 트러블슈팅

### 문제 1: 413 Request Entity Too Large
```
원인: client_max_body_size가 파일보다 작음
해결: client_max_body_size 100M; 추가
```

### 문제 2: 504 Gateway Timeout
```
원인: 파일 처리 시간이 60초 초과
해결: proxy_*_timeout 300; 추가
```

### 문제 3: 404 Not Found
```
원인: proxy_pass 포트가 백엔드와 다름
해결: pm2 logs로 실제 포트 확인 후 수정
```

### 문제 4: CORS 에러
```
원인: 백엔드 CORS 설정이 없거나 틀림
해결: 백엔드 main.ts에 app.enableCors 확인
      (Nginx에서는 처리 불필요, 백엔드가 이미 처리)
```

---

## 📌 왜 Nginx에서 CORS를 안 해도 되나요?

### 백엔드 코드 (src/main.ts):
```typescript
app.enableCors({
  origin: '*',  // 모든 origin 허용
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  maxAge: 3600,
});
```

**이미 백엔드에서 CORS를 처리**하고 있기 때문에, Nginx에서 중복으로 처리하면 오히려 충돌할 수 있습니다.

### Nginx 역할:
- ✅ SSL 종료 (HTTPS → HTTP)
- ✅ 프록시 (외부 → 백엔드)
- ✅ 파일 크기/타임아웃 제한
- ❌ CORS (백엔드가 처리)

---

## 🎯 결론

### 변경한 것:
1. **파일 크기 제한** 1MB → 100MB
2. **타임아웃** 60초 → 300초
3. **proxy_pass 포트** 백엔드 실제 포트로 수정

### 변경 안 한 것:
- CORS 설정 (백엔드가 이미 처리 중)

### 핵심:
**Nginx는 단순 프록시 역할만 하고, 나머지는 백엔드가 처리!**

