# SuChat Backend API 문서

## 🔐 인증 API

### 회원가입 플로우 (이메일 검증 필수)

회원가입은 **2단계**로 진행됩니다:
1. **이메일 인증 요청** → 이메일 발송
2. **이메일 인증 완료** → 계정 생성

---


### 로그인
**POST** `/auth/signin`

사용자 인증을 수행합니다.

#### 요청 본문
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### 응답
```json
{
  "success": true,
  "message": "로그인이 완료되었습니다.",
  "data": {
    "id": "uuid",
    "name": "사용자 이름",
    "email": "user@example.com",
    "phone": "010-1234-5678",
    "birthday": "1990-01-01T00:00:00.000Z",
    "isActive": true,
    "lastLoginAt": "2024-01-01T00:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### 에러 응답
- **401 Unauthorized**: 잘못된 이메일 또는 비밀번호
- **400 Bad Request**: 유효성 검증 실패

---

### 토큰 갱신
**POST** `/auth/refresh`

Refresh Token을 사용하여 새로운 Access Token을 발급받습니다.

#### 요청 본문
```json
{
  "refreshToken": "your_refresh_token",
  "deviceType": "desktop"  // 또는 "mobile"
}
```

#### 응답
```json
{
  "success": true,
  "data": {
    "accessToken": "new_access_token",
    "refreshToken": "new_refresh_token"
  }
}
```

#### 에러 응답
- **401 Unauthorized**: 유효하지 않은 Refresh Token

---

### 로그아웃
**POST** `/auth/logout`

Refresh Token을 무효화하여 로그아웃합니다.

#### 요청 본문
```json
{
  "refreshToken": "your_refresh_token"
}
```

#### 응답
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 👥 사용자 관리 API

### 모든 사용자 목록 조회
**GET** `/users`

모든 사용자 목록을 조회합니다.

#### 응답
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "사용자 이름",
      "email": "user@example.com",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 사용자 검색
**GET** `/users/search?q={query}&limit={limit}&offset={offset}`

이름 또는 이메일로 사용자를 검색합니다.

#### 쿼리 파라미터
- `q`: 검색어 (필수)
- `limit`: 한 번에 가져올 개수 (기본값: 20)
- `offset`: 시작 위치 (기본값: 0)

#### 응답
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid",
        "name": "사용자 이름",
        "email": "user@example.com",
        "isActive": true,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "total": 1
  }
}
```

---

## 👫 친구 관리 API

### 친구 요청 보내기
**POST** `/friends/request`

다른 사용자에게 친구 요청을 보냅니다.

#### 요청 본문
```json
{
  "requesterId": "requester_uuid",
  "addresseeId": "addressee_uuid"
}
```

#### 응답
```json
{
  "success": true,
  "data": {
    "id": "friend_request_id",
    "requesterId": "requester_uuid",
    "addresseeId": "addressee_uuid",
    "status": "PENDING",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 친구 요청 수락
**PUT** `/friends/:friendId/accept`

받은 친구 요청을 수락합니다. (인증 필요)

#### 응답
```json
{
  "success": true,
  "data": {
    "id": "friend_request_id",
    "status": "ACCEPTED"
  }
}
```

---

### 친구 요청 거절
**PUT** `/friends/:friendId/reject`

받은 친구 요청을 거절합니다. (인증 필요)

#### 응답
```json
{
  "success": true,
  "data": {
    "id": "friend_request_id",
    "status": "REJECTED"
  }
}
```

---

### 받은 친구 요청 목록
**GET** `/friends/requests/received`

받은 친구 요청 목록을 조회합니다. (인증 필요)

#### 응답
```json
{
  "success": true,
  "data": [
    {
      "id": "friend_request_id",
      "requester": {
        "id": "uuid",
        "name": "요청자 이름",
        "email": "requester@example.com"
      },
      "status": "PENDING",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 보낸 친구 요청 목록
**GET** `/friends/requests/sent`

보낸 친구 요청 목록을 조회합니다. (인증 필요)

#### 응답
```json
{
  "success": true,
  "data": [
    {
      "id": "friend_request_id",
      "addressee": {
        "id": "uuid",
        "name": "수신자 이름",
        "email": "addressee@example.com"
      },
      "status": "PENDING",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 친구 목록
**GET** `/friends`

현재 사용자의 친구 목록을 조회합니다. (인증 필요)

#### 응답
```json
{
  "success": true,
  "data": [
    {
      "id": "friend_id",
      "friend": {
        "id": "uuid",
        "name": "친구 이름",
        "email": "friend@example.com"
      },
      "status": "ACCEPTED",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 친구 요청 삭제/취소
**DELETE** `/friends/:friendId`

친구 요청을 삭제하거나 취소합니다. (인증 필요)

#### 응답
```json
{
  "success": true
}
```

---

## 📧 이메일 인증 API (회원가입)

### 1단계: 회원가입 (회원가입 시작)
**POST** `/auth/signup`

회원가입 데이터를 저장하고 인증 이메일을 발송합니다.

#### 요청 본문
```json
{
  "name": "사용자 이름",
  "email": "user@example.com",
  "password": "password123",
  "confirmPassword": "password123",
  "phone": "010-1234-5678",  // 선택사항
  "birthday": "1990-01-01"   // 선택사항 (YYYY-MM-DD)
}
```

#### 응답
```json
{
  "success": true,
  "message": "인증 이메일이 발송되었습니다. 이메일을 확인해주세요."
}
```

> 💾 회원가입 데이터가 `email_verifications` 테이블에 임시 저장되고, 인증 이메일이 발송됩니다.

#### 에러 응답
- **400 Bad Request**: 유효성 검증 실패 (필수 필드 누락, 비밀번호 불일치 등)
- **400 Bad Request**: 이미 사용 중인 이메일
- **400 Bad Request**: 이메일 발송 실패

---

### 2단계: 이메일 인증 완료 (회원가입 완료)
**POST** `/auth/verify-email`

이메일 인증 토큰을 검증하고 **실제 계정을 생성**합니다.

#### 요청 본문
```json
{
  "token": "인증_토큰"
}
```

#### 응답
```json
{
  "success": true,
  "message": "이메일 인증이 완료되었습니다."
}
```

> ✅ 인증 완료 시 `email_verifications` 테이블의 데이터가 `users` 테이블로 이동되고, 실제 계정이 생성됩니다.

#### 에러 응답
- **400 Bad Request**: 유효하지 않은 인증 토큰
- **400 Bad Request**: 이미 인증된 이메일
- **400 Bad Request**: 만료된 토큰 (24시간)
- **400 Bad Request**: 인증 데이터 불완전 (다시 회원가입 필요)

---

### 인증 이메일 재발송
**POST** `/auth/resend-verification`

인증 이메일을 재발송합니다.

#### 요청 본문
```json
{
  "email": "user@example.com"
}
```

#### 응답
```json
{
  "success": true,
  "message": "인증 이메일이 재발송되었습니다."
}
```

#### 에러 응답
- **400 Bad Request**: 인증 요청을 찾을 수 없음
- **400 Bad Request**: 이미 인증된 이메일

---

## 🔑 비밀번호 재설정 API

### 비밀번호 재설정 요청
**POST** `/auth/forgot-password`

비밀번호 재설정 이메일을 발송합니다.

#### 요청 본문
```json
{
  "email": "user@example.com"
}
```

#### 응답
```json
{
  "success": true,
  "message": "비밀번호 재설정 이메일이 발송되었습니다."
}
```

#### 에러 응답
- **404 Not Found**: 해당 이메일로 등록된 사용자를 찾을 수 없음
- **400 Bad Request**: 이메일 발송 실패

---

### 비밀번호 재설정
**POST** `/auth/reset-password`

새로운 비밀번호로 재설정합니다.

#### 요청 본문
```json
{
  "token": "reset_token",
  "newPassword": "newpassword123"
}
```

#### 응답
```json
{
  "success": true,
  "message": "비밀번호가 성공적으로 재설정되었습니다."
}
```

#### 에러 응답
- **404 Not Found**: 유효하지 않은 토큰
- **400 Bad Request**: 이미 사용된 토큰, 만료된 토큰, 또는 비밀번호 불일치

---

## 📁 파일 업로드 API

### 파일 업로드
**POST** `/file/upload`

이미지, 비디오, 문서 파일을 업로드합니다. **아이폰 HEIC/HEIF 이미지를 자동으로 JPEG로 변환**합니다.

#### 요청 형식
- **Content-Type**: `multipart/form-data`
- **인증**: 필요 없음 (공개 API)

#### 폼 데이터
```javascript
const formData = new FormData()
formData.append('file', file)              // 업로드할 파일
formData.append('userId', 'user-uuid')     // 업로드 사용자 ID
formData.append('roomId', 'room-uuid')     // 채팅방 ID
```

#### 지원 파일 형식
- **이미지**: JPEG, PNG, GIF, WebP, BMP, TIFF, SVG
- **📱 아이폰 이미지**: HEIC, HEIF, HEIC-Sequence, HEIF-Sequence
- **비디오**: MP4, WebM, MOV (아이폰), M4V
- **문서**: PDF, DOC, DOCX

#### 파일 크기 제한
- 최대: 100MB

#### 응답
```json
{
  "jobId": "job-id",
  "fileId": "abc123def",
  "fileName": "abc123def.jpg",
  "fileType": "images",
  "fileUrl": "/uploads/images/abc123def.jpg",
  "originalName": "photo.heic",
  "size": 2048576,
  "status": "completed",
  "message": "File uploaded successfully, processing...",
  "result": {
    "fileId": "abc123def",
    "originalName": "photo.heic",
    "mimeType": "image/heic",
    "size": 2048576,
    "finalPath": "/images/abc123def.jpg",
    "thumbnailPath": "/thumbnails/abc123def_thumb.jpg",
    "processedAt": "2025-10-19T10:30:00.000Z"
  }
}
```

#### 에러 응답
- **400 Bad Request**: 
  - 파일이 없음
  - 허용되지 않은 파일 형식
  - 파일 크기 초과 (100MB)
- **500 Internal Server Error**: 파일 처리 중 오류 발생

#### 📱 아이폰 이미지 처리 특징
1. **HEIC/HEIF → JPEG 자동 변환**
   - 아이폰에서 촬영한 HEIC/HEIF 이미지를 JPEG로 변환
   - 모든 브라우저에서 호환 가능한 형식으로 저장
   
2. **MIME 타입 유연성**
   - 잘못된 MIME 타입으로 전송되어도 확장자 기반으로 검증
   - `application/octet-stream`으로 전송되는 HEIC 파일도 처리 가능
   
3. **이미지 최적화**
   - 자동 리사이징 (최대 1920x1080, 비율 유지)
   - JPEG 품질 85%로 압축
   - 300x300 썸네일 자동 생성

4. **Live Photo 지원**
   - `image/heic-sequence`, `image/heif-sequence` 지원

---

### 파일 처리 상태 확인
**GET** `/file/status/:jobId`

파일 처리 작업의 현재 상태를 확인합니다.

#### URL 파라미터
- `jobId`: 파일 업로드 시 받은 작업 ID

#### 응답
```json
{
  "status": "completed",
  "progress": 100,
  "result": {
    "fileId": "abc123def",
    "originalName": "photo.heic",
    "finalPath": "/images/abc123def.jpg",
    "thumbnailPath": "/thumbnails/abc123def_thumb.jpg",
    "processedAt": "2025-10-19T10:30:00.000Z"
  }
}
```

#### 상태 값
- `waiting`: 대기 중
- `active`: 처리 중
- `completed`: 완료
- `failed`: 실패
- `not_found`: 작업을 찾을 수 없음

---

### 파일 서빙
**GET** `/file/serve/:type/:filename`

업로드된 파일을 제공합니다.

#### URL 파라미터
- `type`: 파일 타입 (`images`, `videos`, `docs`, `thumbnails`)
- `filename`: 파일명

#### 예시
```
GET /file/serve/images/abc123def.jpg
GET /file/serve/thumbnails/abc123def_thumb.jpg
GET /file/serve/videos/xyz789.mp4
```

#### 응답
파일 바이너리 데이터 (실제 파일)

---

## 📝 유효성 검증 규칙

### 회원가입 데이터
- **name**: 필수, 최소 2자 이상
- **email**: 필수, 유효한 이메일 형식, 고유해야 함
- **password**: 필수, 최소 6자 이상
- **confirmPassword**: 필수, password와 일치해야 함
- **phone**: 선택사항, 숫자, 하이픈, 공백, 괄호, + 기호만 허용
- **birthday**: 선택사항, YYYY-MM-DD 형식

### 로그인 데이터
- **email**: 필수, 유효한 이메일 형식
- **password**: 필수, 최소 6자 이상

---

## 🔒 보안 기능

### 비밀번호 암호화
- bcrypt를 사용하여 비밀번호를 해시화
- Salt rounds: 10

### 에러 처리
- 민감한 정보 노출 방지
- 일관된 에러 응답 형식
- 적절한 HTTP 상태 코드 사용

---

## 🚀 사용 예시

### JavaScript/TypeScript
```typescript
import { apiClient } from '@/lib/api';

// 회원가입 (이메일 인증 필수)
const signUpData = {
  name: '홍길동',
  email: 'hong@example.com',
  password: 'password123',
  confirmPassword: 'password123',
  phone: '010-1234-5678',
  birthday: '1990-01-01'
};

// 1단계: 회원가입 요청
const response = await apiClient.signUp(signUpData);
// 이메일 발송됨, 사용자가 이메일 확인 필요

// 2단계: 이메일 인증 (사용자가 링크 클릭 후)
const verifyResponse = await apiClient.verifyEmail('받은_토큰');
// 계정 생성 완료

// 로그인
const signInData = {
  email: 'hong@example.com',
  password: 'password123'
};

const loginResponse = await apiClient.signIn(signInData);
console.log(loginResponse.data);

// 사용자 검색
const searchResponse = await apiClient.searchUsers('홍길동', 20, 0);
console.log(searchResponse.data.users);

// 친구 요청 보내기
const friendRequest = await apiClient.sendFriendRequest('friend_uuid');
console.log(friendRequest.data);
```

### cURL
```bash
# 회원가입 (이메일 인증 필수)
curl -X POST http://localhost:8000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "홍길동",
    "email": "hong@example.com",
    "password": "password123",
    "confirmPassword": "password123",
    "phone": "010-1234-5678",
    "birthday": "1990-01-01"
  }'

# 이메일 인증
curl -X POST http://localhost:8000/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "token": "받은_인증_토큰"
  }'

# 로그인
curl -X POST http://localhost:8000/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "hong@example.com",
    "password": "password123",
    "deviceType": "desktop"
  }'

# 사용자 검색
curl -X GET "http://localhost:8000/users/search?q=홍길동&limit=20&offset=0"

# 친구 요청 보내기
curl -X POST http://localhost:8000/friends/request \
  -H "Content-Type: application/json" \
  -d '{
    "requesterId": "your_user_id",
    "addresseeId": "friend_user_id"
  }'

# 친구 목록 조회 (인증 필요)
curl -X GET http://localhost:8000/friends \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 📊 데이터베이스 스키마

### users 테이블
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  birthday DATE,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

이 API 문서는 SuChat Backend의 인증 시스템을 위한 완전한 가이드입니다. 모든 엔드포인트는 RESTful 원칙을 따르며, 적절한 에러 처리와 유효성 검증을 포함합니다.
