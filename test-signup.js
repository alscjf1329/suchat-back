// Node.js 18+ 내장 fetch 사용

async function testSignup() {
  try {
    console.log('🧪 회원가입 API 테스트 시작...');
    
    const response = await fetch('http://localhost:8000/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: '테스트3',
        email: 'test3@test.com',
        password: '123456',
        confirmPassword: '123456'
      })
    });

    const result = await response.json();
    console.log('✅ 회원가입 응답:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('📧 이메일 발송 테스트...');
      
      const emailResponse = await fetch('http://localhost:8000/auth/send-verification-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test3@test.com',
          name: '테스트3'
        })
      });

      const emailResult = await emailResponse.json();
      console.log('📧 이메일 발송 응답:', JSON.stringify(emailResult, null, 2));
    }

  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
  }
}

testSignup();
