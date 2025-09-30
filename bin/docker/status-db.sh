#!/bin/bash

echo "🔍 Suchat Docker 서비스 상태 확인..."

echo
echo "📊 컨테이너 상태:"
docker-compose ps

echo
echo "📈 리소스 사용량:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"

echo
echo "📋 로그 확인:"
echo "  - PostgreSQL 로그: docker-compose logs postgres"
echo "  - Redis 로그: docker-compose logs redis"
echo "  - 전체 로그: docker-compose logs"
echo
