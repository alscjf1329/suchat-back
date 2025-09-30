#!/bin/bash

echo "🐳 Suchat Docker 서비스 시작 중..."

echo
echo "📊 PostgreSQL 시작..."
docker-compose up -d postgres

echo
echo "🔴 Redis 시작..."
docker-compose up -d redis

echo
echo "🛠️ 관리 도구들 시작..."
docker-compose up -d pgadmin redis-commander

echo
echo "✅ 모든 서비스가 시작되었습니다!"
echo
echo "📋 서비스 정보:"
echo "  - PostgreSQL: localhost:5432"
echo "  - Redis: localhost:6379"
echo "  - pgAdmin: http://localhost:8080 (admin@suchat.com / admin123)"
echo "  - Redis Commander: http://localhost:8081"
echo
echo "🔍 서비스 상태 확인:"
docker-compose ps

echo
echo "📝 환경 설정 (.env 파일):"
echo "  DB_HOST=localhost"
echo "  DB_PORT=5432"
echo "  DB_USERNAME=postgres"
echo "  DB_PASSWORD=postgres123"
echo "  DB_DATABASE=suchat"
echo "  REDIS_HOST=localhost"
echo "  REDIS_PORT=6379"
echo "  USE_MEMORY_DB=false"
echo