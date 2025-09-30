#!/bin/bash

echo "🛑 Suchat Docker 서비스 중지 중..."

docker-compose down

echo
echo "✅ 모든 서비스가 중지되었습니다!"
echo
echo "💾 데이터는 보존됩니다. 완전 삭제하려면 'clean-db.sh'을 실행하세요."
echo
