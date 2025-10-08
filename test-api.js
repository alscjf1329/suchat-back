// API 테스트 스크립트
const API_BASE_URL = 'http://localhost:3000';

async function testSignUp() {
  const signUpData = {
    name: '테스트 사용자',
    email: 'test@example.com',
    password: 'password123',
    confirmPassword: 'password123',
    phone: '010-1234-5678',
    birthday: '1990-01-01'
  };

  try {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(signUpData),
    });

    const result = await response.json();
    console.log('회원가입 테스트 결과:', result);
    
    if (result.success) {
      console.log('✅ 회원가입 성공!');
      return result.data.id;
    } else {
      console.log('❌ 회원가입 실패:', result.message);
    }
  } catch (error) {
    console.error('❌ 회원가입 에러:', error);
  }
}

async function testSignIn() {
  const signInData = {
    email: 'test@example.com',
    password: 'password123'
  };

  try {
    const response = await fetch(`${API_BASE_URL}/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(signInData),
    });

    const result = await response.json();
    console.log('로그인 테스트 결과:', result);
    
    if (result.success) {
      console.log('✅ 로그인 성공!');
    } else {
      console.log('❌ 로그인 실패:', result.message);
    }
  } catch (error) {
    console.error('❌ 로그인 에러:', error);
  }
}

async function runTests() {
  console.log('🚀 API 테스트 시작...\n');
  
  // 회원가입 테스트
  console.log('1. 회원가입 테스트');
  await testSignUp();
  
  console.log('\n2. 로그인 테스트');
  await testSignIn();
  
  console.log('\n✅ 모든 테스트 완료!');
}

// Node.js 환경에서 실행
if (typeof window === 'undefined') {
  runTests().catch(console.error);
}

// 브라우저 환경에서 실행
if (typeof window !== 'undefined') {
  window.testAPI = { testSignUp, testSignIn, runTests };
}
