import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // 정적 파일 서빙 설정
  app.useStaticAssets(join(__dirname, '..', 'public'));
  
  // CORS 설정
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  
  await app.listen(process.env.PORT ?? 3000);
  console.log(`🚀 서버가 http://localhost:${process.env.PORT ?? 3000}에서 실행 중입니다.`);
  console.log(`📱 채팅 UI: http://localhost:${process.env.PORT ?? 3000}/index.html`);
}
bootstrap();
