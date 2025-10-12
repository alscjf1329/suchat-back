import { registerAs } from '@nestjs/config';

export default registerAs('push', () => ({
  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY || '',
    privateKey: process.env.VAPID_PRIVATE_KEY || '',
    subject: process.env.VAPID_SUBJECT || 'mailto:admin@suchat.com',
  },
  // 푸시 알림 기본 설정
  defaults: {
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    ttl: 86400, // 24시간 (초 단위)
  },
}));

