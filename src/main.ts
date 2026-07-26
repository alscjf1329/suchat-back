import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import compression from 'compression';
import { types } from 'pg';

// pg 드라이버가 timestamp without time zone 컬럼을 로컬 타임존으로 잘못 파싱하는 문제 수정
// OID 1114 = timestamp, OID 1184 = timestamptz
// DB에 UTC로 저장된 값이 KST로 파싱되어 9시간 오차 발생 → 강제로 UTC로 해석
types.setTypeParser(1114, (val: string) => new Date(val + 'Z'));

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: process.env.NODE_ENV === 'production' 
      ? ['log', 'error', 'warn'] 
      : ['log', 'error', 'warn', 'debug'],
  });
  
  // 압축 미들웨어 (gzip)
  app.use(compression());
  
  // 정적 파일 서빙 설정
  app.useStaticAssets(join(__dirname, '..', 'public'), {
    maxAge: '1d',
    etag: true,
  });
  
  // 업로드된 파일 서빙 설정
  const uploadPath = process.env.UPLOAD_PATH || './uploads';
  const uploadsDir = uploadPath.startsWith('.') 
    ? join(process.cwd(), uploadPath.replace(/^\.\//, '')) 
    : uploadPath;
  
  console.log(`📤 업로드 경로: ${uploadsDir}`);
  
  app.useStaticAssets(uploadsDir, {
    prefix: '/uploads/',
    maxAge: '7d',
    etag: true,
  });
  
  // CORS 설정
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    maxAge: 3600,
  });
  
  // 전역 ValidationPipe 설정
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: false, // 선택적 필드 허용
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));
  
  await app.listen(process.env.PORT ?? 3000);
  console.log(`🚀 서버가 http://localhost:${process.env.PORT ?? 3000}에서 실행 중입니다.`);
  console.log(`📱 채팅 UI: http://localhost:${process.env.PORT ?? 3000}/index.html`);
}
bootstrap();
