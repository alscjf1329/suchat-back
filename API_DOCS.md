# SuChat Backend API 문서

## 🔐 인증 API

### 회원가입
**POST** `/auth/signup`

새로운 사용자 계정을 생성합니다.

#### 요청 본문
```json
{
  "name": "사용자 이름",
  "email": "user@example.com",
  "password": "password123",
  "confirmPassword": "password123",
  "phone": "010-1234-5678",        // 선택사항
  "birthday": "1990-01-01"         // 선택사항 (YYYY-MM-DD 형식)
}
```

#### 응답
```json
{
  "success": true,
  "message": "회원가입이 완료되었습니다.",
  "data": {
    "id": "uuid",
    "name": "사용자 이름",
    "email": "user@example.com",
    "phone": "010-1234-5678",
    "birthday": "1990-01-01T00:00:00.000Z",
    "isActive": true,
    "lastLoginAt": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### 에러 응답
- **409 Conflict**: 이미 존재하는 이메일
- **400 Bad Request**: 유효성 검증 실패

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

### 사용자 정보 조회
**GET** `/auth/user/:id`

특정 사용자의 정보를 조회합니다.

#### 응답
```json
{
  "success": true,
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
- **404 Not Found**: 사용자를 찾을 수 없음

---

### 사용자 정보 수정
**PUT** `/auth/user/:id`

사용자 정보를 수정합니다.

#### 요청 본문
```json
{
  "name": "새로운 이름",
  "phone": "010-9876-5432",
  "birthday": "1995-05-15"
}
```

#### 응답
```json
{
  "success": true,
  "message": "사용자 정보가 업데이트되었습니다.",
  "data": {
    "id": "uuid",
    "name": "새로운 이름",
    "email": "user@example.com",
    "phone": "010-9876-5432",
    "birthday": "1995-05-15T00:00:00.000Z",
    "isActive": true,
    "lastLoginAt": "2024-01-01T00:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### 에러 응답
- **404 Not Found**: 사용자를 찾을 수 없음
- **400 Bad Request**: 유효성 검증 실패

---

### 사용자 삭제
**DELETE** `/auth/user/:id`

사용자 계정을 삭제합니다.

#### 응답
```json
{
  "success": true,
  "message": "사용자 계정이 삭제되었습니다."
}
```

#### 에러 응답
- **404 Not Found**: 사용자를 찾을 수 없음

---

## 📧 이메일 중복 확인 API

### 이메일 중복 확인
**POST** `/auth/check-email`

이메일이 이미 사용 중인지 확인합니다.

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
  "data": {
    "exists": false
  }
}
```

#### 에러 응답
- **400 Bad Request**: 유효성 검증 실패

---

## 📧 이메일 인증 API

### 이메일 인증
**POST** `/auth/verify-email?token={token}`

이메일 인증 토큰을 검증합니다.

#### 쿼리 파라미터
- `token`: 이메일 인증 토큰

#### 응답
```json
{
  "success": true,
  "message": "이메일 인증이 완료되었습니다."
}
```

#### 에러 응답
- **404 Not Found**: 유효하지 않은 인증 토큰
- **400 Bad Request**: 이미 인증된 이메일 또는 만료된 토큰

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
- **404 Not Found**: 인증 요청을 찾을 수 없음
- **400 Bad Request**: 이미 인증된 이메일

---

### 비밀번호 재설정 요청
**POST** `/auth/request-password-reset`

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

### 비밀번호 재설정 토큰 검증
**GET** `/auth/verify-password-reset-token?token={token}`

비밀번호 재설정 토큰을 검증합니다.

#### 쿼리 파라미터
- `token`: 비밀번호 재설정 토큰

#### 응답
```json
{
  "success": true,
  "email": "user@example.com"
}
```

#### 에러 응답
- **404 Not Found**: 유효하지 않은 토큰
- **400 Bad Request**: 이미 사용된 토큰 또는 만료된 토큰

---

### 비밀번호 재설정
**POST** `/auth/reset-password`

새로운 비밀번호로 재설정합니다.

#### 요청 본문
```json
{
  "token": "reset_token",
  "password": "newpassword123",
  "confirmPassword": "newpassword123"
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

// 회원가입
const signUpData = {
  name: '홍길동',
  email: 'hong@example.com',
  password: 'password123',
  confirmPassword: 'password123',
  phone: '010-1234-5678',
  birthday: '1990-01-01'
};

const response = await apiClient.signUp(signUpData);
console.log(response.data);

// 로그인
const signInData = {
  email: 'hong@example.com',
  password: 'password123'
};

const loginResponse = await apiClient.signIn(signInData);
console.log(loginResponse.data);

// 이메일 중복 확인
const emailCheckResponse = await apiClient.checkEmailExists('hong@example.com');
console.log(emailCheckResponse.data.exists); // false
```

### cURL
```bash
# 회원가입
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "홍길동",
    "email": "hong@example.com",
    "password": "password123",
    "confirmPassword": "password123",
    "phone": "010-1234-5678",
    "birthday": "1990-01-01"
  }'

# 로그인
curl -X POST http://localhost:3000/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "hong@example.com",
    "password": "password123"
  }'

# 이메일 중복 확인
curl -X POST http://localhost:3000/auth/check-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "hong@example.com"
  }'
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
