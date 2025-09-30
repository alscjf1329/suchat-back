#!/bin/bash

echo "⚠️  경고: 모든 데이터가 삭제됩니다!"
echo
read -p "정말로 모든 데이터를 삭제하시겠습니까? (y/N): " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "취소되었습니다."
    exit 0
fi

echo
echo "🗑️  모든 서비스 중지 및 데이터 삭제 중..."

docker-compose down -v
docker-compose rm -f

echo
echo "✅ 모든 데이터가 삭제되었습니다!"
echo
