// 이메일 발송 테스트 스크립트
const API_BASE_URL = 'http://localhost:3000';

async function testEmailSending() {
  const testData = {
    email: 'test@example.com',
    name: '테스트 사용자'
  };

  try {
    console.log('📧 이메일 발송 테스트 시작...');
    
    const response = await fetch(`${API_BASE_URL}/auth/send-verification-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    const result = await response.json();
    console.log('📧 이메일 발송 결과:', result);
    
    if (result.success) {
      console.log('✅ 이메일 발송 성공!');
      console.log('🔗 인증 토큰:', result.token);
      console.log('📧 이메일을 확인해보세요!');
    } else {
      console.log('❌ 이메일 발송 실패:', result.message);
    }
  } catch (error) {
    console.error('❌ 이메일 발송 에러:', error);
  }
}

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
    console.log('👤 회원가입 테스트 시작...');
    
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(signUpData),
    });

    const result = await response.json();
    console.log('👤 회원가입 결과:', result);
    
    if (result.success) {
      console.log('✅ 회원가입 성공!');
      
      // 이메일 발송 테스트
      await testEmailSending();
    } else {
      console.log('❌ 회원가입 실패:', result.message);
    }
  } catch (error) {
    console.error('❌ 회원가입 에러:', error);
  }
}

// 테스트 실행
console.log('🚀 SuChat 이메일 인증 테스트 시작...\n');

// 서버가 실행 중인지 확인
fetch(`${API_BASE_URL}/`)
  .then(() => {
    console.log('✅ 서버가 실행 중입니다.');
    testSignUp();
  })
  .catch(() => {
    console.log('❌ 서버가 실행되지 않았습니다. 먼저 서버를 시작해주세요.');
    console.log('   npm run start:dev');
  });
