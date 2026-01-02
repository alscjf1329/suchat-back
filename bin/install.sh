#!/bin/bash

# ========================================
# SuChat 자동 설치 스크립트
# ========================================
# 사용법:
#   ./bin/install.sh dev   # 개발 환경 설치
#   ./bin/install.sh op    # 운영 환경 설치
# ========================================

set -e  # 오류 발생 시 스크립트 중단

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✅${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

log_error() {
    echo -e "${RED}❌${NC} $1"
}

# 프로젝트 루트 디렉토리 확인
SCRIPT_22

ENV_TYPE="$1"

if [ "$ENV_TYPE" != "dev" ] && [ "$ENV_TYPE" != "op" ]; then
    log_error "잘못된 인수입니다: '$ENV_TYPE'"
    echo ""
    echo "사용법:"
    echo "  ./install.sh dev   # 개발 환경 설치"
    echo "  ./install.sh op    # 운영 환경 설치"
    exit 1
fi

log_info "=========================================="
log_info "SuChat ${ENV_TYPE} 환경 설치 시작"
log_info "=========================================="
echo ""

# ========================================
# 1. 사전 요구사항 확인
# ========================================
log_info "1️⃣ 사전 요구사항 확인 중..."

check_command() {
    if command -v "$1" &> /dev/null; then
        VERSION=$($1 --version 2>&1 | head -n 1)
        log_success "$1 설치됨: $VERSION"
        return 0
    else
        log_error "$1이 설치되어 있지 않습니다."
        return 1
    fi
}

MISSING_DEPS=0

if ! check_command node; then
    MISSING_DEPS=1
    log_warning "Node.js 18 이상이 필요합니다: https://nodejs.org/"
fi

if ! check_command pnpm; then
    MISSING_DEPS=1
    log_warning "pnpm 설치: npm install -g pnpm"
fi

if ! check_command docker; then
    MISSING_DEPS=1
    log_warning "Docker 설치: https://www.docker.com/products/docker-desktop"
fi

if ! check_command docker; then
    MISSING_DEPS=1
    log_warning "Docker Compose가 필요합니다."
fi

if [ $MISSING_DEPS -eq 1 ]; then
    log_error "필수 도구가 누락되었습니다. 위의 경고를 확인하세요."
    exit 1
fi

# Node.js 버전 확인
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    log_error "Node.js 18 이상이 필요합니다. 현재 버전: $(node -v)"
    exit 1
fi

log_success "모든 사전 요구사항이 충족되었습니다."
echo ""

# ========================================
# 2. 백엔드 의존성 설치
# ========================================
log_info "2️⃣ 백엔드 의존성 설치 중..."
if [ ! -d "node_modules" ]; then
    pnpm install
    log_success "백엔드 의존성 설치 완료"
else
    log_info "node_modules가 이미 존재합니다. 건너뜁니다."
fi
echo ""

# ========================================
# 3. 환경 변수 설정
# ========================================
log_info "3️⃣ 환경 변수 설정 중..."

if [ -f ".env" ]; then
    log_warning ".env 파일이 이미 존재합니다."
    read -p "덮어쓰시겠습니까? (y/N): " OVERWRITE
    if [ "$OVERWRITE" != "y" ] && [ "$OVERWRITE" != "Y" ]; then
        log_info ".env 파일 설정을 건너뜁니다."
        SKIP_ENV=true
    fi
fi

if [ "$SKIP_ENV" != "true" ]; then
    if [ "$ENV_TYPE" = "dev" ]; then
        # 개발 환경: 자동 생성
        log_info "개발 환경용 .env 파일 생성 중..."
        
        # JWT_SECRET 생성
        JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
        log_success "JWT_SECRET 생성 완료"
        
        # VAPID 키 생성
        log_info "VAPID 키 생성 중..."
        VAPID_OUTPUT=$(pnpm exec web-push generate-vapid-keys 2>&1 || npx web-push generate-vapid-keys 2>&1)
        VAPID_PUBLIC=$(echo "$VAPID_OUTPUT" | grep "Public Key:" | cut -d':' -f2 | xargs)
        VAPID_PRIVATE=$(echo "$VAPID_OUTPUT" | grep "Private Key:" | cut -d':' -f2 | xargs)
        
        if [ -z "$VAPID_PUBLIC" ] || [ -z "$VAPID_PRIVATE" ]; then
            log_error "VAPID 키 생성 실패"
            exit 1
        fi
        
        log_success "VAPID 키 생성 완료"
        
        # .env 파일 생성
        cat > .env << EOF
# ============================================
# SuChat Backend 환경 변수 설정 (개발 환경)
# ============================================
# 자동 생성됨: $(date)

# 서버 설정
NODE_ENV=development
PORT=8000

# ============================================
# 필수 환경 변수
# ============================================

# JWT 인증
JWT_SECRET=${JWT_SECRET}

# VAPID 키 (푸시 알림용)
VAPID_PUBLIC_KEY=${VAPID_PUBLIC}
VAPID_PRIVATE_KEY=${VAPID_PRIVATE}
VAPID_SUBJECT=mailto:admin@suchat.com

# ============================================
# 데이터베이스 설정 (PostgreSQL)
# ============================================
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres123
DB_DATABASE=suchat

# ============================================
# Redis 설정
# ============================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# ============================================
# 파일 업로드 설정
# ============================================
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=104857600

# ============================================
# 이메일 설정 (SMTP) - 선택사항
# ============================================
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your_email@gmail.com
# SMTP_PASS=your_app_password
# EMAIL_FROM=noreply@suchat.com
# FRONTEND_URL=http://localhost:3000
EOF
        
        log_success ".env 파일 생성 완료"
        
    else
        # 운영 환경: 사용자 입력 받기
        log_info "운영 환경용 .env 파일 설정"
        log_warning "운영 환경에서는 보안을 위해 강력한 비밀키를 사용하세요."
        echo ""
        
        read -p "JWT_SECRET (32자 이상, 엔터 시 자동 생성): " JWT_SECRET
        if [ -z "$JWT_SECRET" ]; then
            JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
            log_info "JWT_SECRET 자동 생성됨"
        fi
        
        log_info "VAPID 키 생성 중..."
        VAPID_OUTPUT=$(pnpm exec web-push generate-vapid-keys 2>&1 || npx web-push generate-vapid-keys 2>&1)
        VAPID_PUBLIC=$(echo "$VAPID_OUTPUT" | grep "Public Key:" | cut -d':' -f2 | xargs)
        VAPID_PRIVATE=$(echo "$VAPID_OUTPUT" | grep "Private Key:" | cut -d':' -f2 | xargs)
        
        read -p "DB_HOST [localhost]: " DB_HOST
        DB_HOST=${DB_HOST:-localhost}
        
        read -p "DB_PORT [5432]: " DB_PORT
        DB_PORT=${DB_PORT:-5432}
        
        read -p "DB_USERNAME [postgres]: " DB_USERNAME
        DB_USERNAME=${DB_USERNAME:-postgres}
        
        read -sp "DB_PASSWORD: " DB_PASSWORD
        echo ""
        
        read -p "DB_DATABASE [suchat]: " DB_DATABASE
        DB_DATABASE=${DB_DATABASE:-suchat}
        
        read -p "REDIS_HOST [localhost]: " REDIS_HOST
        REDIS_HOST=${REDIS_HOST:-localhost}
        
        read -p "REDIS_PORT [6379]: " REDIS_PORT
        REDIS_PORT=${REDIS_PORT:-6379}
        
        read -sp "REDIS_PASSWORD (선택): " REDIS_PASSWORD
        echo ""
        
        cat > .env << EOF
# ============================================
# SuChat Backend 환경 변수 설정 (운영 환경)
# ============================================
# 생성됨: $(date)

# 서버 설정
NODE_ENV=production
PORT=8000

# ============================================
# 필수 환경 변수
# ============================================

# JWT 인증
JWT_SECRET=${JWT_SECRET}

# VAPID 키 (푸시 알림용)
VAPID_PUBLIC_KEY=${VAPID_PUBLIC}
VAPID_PRIVATE_KEY=${VAPID_PRIVATE}
VAPID_SUBJECT=mailto:admin@suchat.com

# ============================================
# 데이터베이스 설정 (PostgreSQL)
# ============================================
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
DB_USERNAME=${DB_USERNAME}
DB_PASSWORD=${DB_PASSWORD}
DB_DATABASE=${DB_DATABASE}

# ============================================
# Redis 설정
# ============================================
REDIS_HOST=${REDIS_HOST}
REDIS_PORT=${REDIS_PORT}
REDIS_PASSWORD=${REDIS_PASSWORD}

# ============================================
# 파일 업로드 설정
# ============================================
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=104857600

# ============================================
# 이메일 설정 (SMTP) - 필수
# ============================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=noreply@suchat.com
FRONTEND_URL=https://yourdomain.com
EOF
        
        log_success ".env 파일 생성 완료"
        log_warning "운영 환경에서는 SMTP 설정을 반드시 수정하세요!"
    fi
fi
echo ""

# ========================================
# 4. 프론트엔드 설정 (개발 환경만)
# ========================================
if [ "$ENV_TYPE" = "dev" ]; then
    log_info "4️⃣ 프론트엔드 환경 변수 설정 중..."
    
    FRONTEND_DIR="../suchat-front"
    if [ ! -d "$FRONTEND_DIR" ]; then
        log_warning "프론트엔드 디렉토리를 찾을 수 없습니다: $FRONTEND_DIR"
        log_info "프론트엔드 설정을 건너뜁니다."
    else
        cd "$FRONTEND_DIR"
        
        # VAPID_PUBLIC_KEY 읽기
        if [ -f "../suchat-back/.env" ]; then
            VAPID_PUBLIC_KEY=$(grep "^VAPID_PUBLIC_KEY=" "../suchat-back/.env" | cut -d'=' -f2)
            
            if [ -f ".env.local" ]; then
                log_warning ".env.local 파일이 이미 존재합니다."
                read -p "덮어쓰시겠습니까? (y/N): " OVERWRITE
                if [ "$OVERWRITE" != "y" ] && [ "$OVERWRITE" != "Y" ]; then
                    log_info ".env.local 파일 설정을 건너뜁니다."
                else
                    SKIP_FRONTEND_ENV=false
                fi
            else
                SKIP_FRONTEND_ENV=false
            fi
            
            if [ "$SKIP_FRONTEND_ENV" != "true" ]; then
                cat > .env.local << EOF
# SuChat Frontend 환경 변수 설정 (개발 환경)
# 자동 생성됨: $(date)

# API 설정
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=http://localhost:8000

# VAPID 키 (푸시 알림용) - 백엔드와 동일한 공개키
NEXT_PUBLIC_VAPID_KEY=${VAPID_PUBLIC_KEY}
EOF
                log_success "프론트엔드 .env.local 파일 생성 완료"
                
                # 프론트엔드 의존성 설치
                if [ ! -d "node_modules" ]; then
                    log_info "프론트엔드 의존성 설치 중..."
                    pnpm install || npm install || yarn install
                    log_success "프론트엔드 의존성 설치 완료"
                fi
            fi
        else
            log_warning "백엔드 .env 파일을 찾을 수 없습니다."
        fi
        
        cd "$PROJECT_ROOT"
    fi
    echo ""
fi

# ========================================
# 5. Docker 컨테이너 실행 (개발 환경만)
# ========================================
if [ "$ENV_TYPE" = "dev" ]; then
    log_info "5️⃣ Docker 컨테이너 실행 중..."
    
    cd bin/docker
    
    # Docker가 실행 중인지 확인
    if ! docker info &> /dev/null; then
        log_error "Docker가 실행되고 있지 않습니다. Docker Desktop을 시작하세요."
        exit 1
    fi
    
    # 컨테이너 시작
    docker compose up -d
    
    log_success "Docker 컨테이너 시작 완료"
    
    # 컨테이너가 준비될 때까지 대기
    log_info "데이터베이스 준비 대기 중..."
    sleep 5
    
    # PostgreSQL 연결 확인
    for i in {1..30}; do
        if docker compose exec -T postgres psql -U postgres -d suchat -c "SELECT 1;" &> /dev/null; then
            log_success "PostgreSQL 연결 확인 완료"
            break
        fi
        if [ $i -eq 30 ]; then
            log_error "PostgreSQL 연결 실패"
            exit 1
        fi
        sleep 1
    done
    
    cd "$PROJECT_ROOT"
    echo ""
    
    # ========================================
    # 6. 데이터베이스 초기화 (개발 환경만)
    # ========================================
    log_info "6️⃣ 데이터베이스 초기화 중..."
    
    # 테이블 존재 확인
    TABLE_EXISTS=$(docker compose -f bin/docker/docker-compose.yml exec -T postgres psql -U postgres -d suchat -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users');" 2>/dev/null || echo "f")
    
    if [ "$TABLE_EXISTS" = "t" ]; then
        log_warning "데이터베이스가 이미 초기화되어 있습니다."
        read -p "초기화를 다시 실행하시겠습니까? (y/N): " REINIT
        if [ "$REINIT" != "y" ] && [ "$REINIT" != "Y" ]; then
            log_info "데이터베이스 초기화를 건너뜁니다."
            SKIP_DB_INIT=true
        fi
    fi
    
    if [ "$SKIP_DB_INIT" != "true" ]; then
        log_info "초기화 스크립트 실행 중..."
        cat bin/query/init.sql | docker compose -f bin/docker/docker-compose.yml exec -T postgres psql -U postgres -d suchat > /dev/null 2>&1
        
        if [ $? -eq 0 ]; then
            log_success "데이터베이스 초기화 완료"
            log_info "테스트 계정: kim@example.com ~ lim@example.com / password123"
        else
            log_error "데이터베이스 초기화 실패"
            exit 1
        fi
    fi
    echo ""
fi

# ========================================
# 7. 프로덕션 빌드 (운영 환경만)
# ========================================
if [ "$ENV_TYPE" = "op" ]; then
    log_info "7️⃣ 프로덕션 빌드 중..."
    
    pnpm run build
    
    if [ $? -eq 0 ]; then
        log_success "프로덕션 빌드 완료"
    else
        log_error "프로덕션 빌드 실패"
        exit 1
    fi
    echo ""
fi

# ========================================
# 설치 완료
# ========================================
log_success "=========================================="
log_success "SuChat ${ENV_TYPE} 환경 설치 완료!"
log_success "=========================================="
echo ""

if [ "$ENV_TYPE" = "dev" ]; then
    echo "다음 단계:"
    echo "  1. 백엔드 서버 실행:"
    echo "     cd suchat-back"
    echo "     pnpm run start:dev"
    echo ""
    echo "  2. 프론트엔드 서버 실행 (새 터미널):"
    echo "     cd suchat-front"
    echo "     pnpm run dev"
    echo ""
    echo "접속 정보:"
    echo "  - 프론트엔드: http://localhost:3000"
    echo "  - 백엔드 API: http://localhost:8000"
    echo "  - pgAdmin: http://localhost:8080 (admin@suchat.com / admin123)"
    echo "  - Redis Commander: http://localhost:8081"
else
    echo "다음 단계:"
    echo "  1. .env 파일의 SMTP 설정을 수정하세요"
    echo "  2. PM2로 서버 실행:"
    echo "     pm2 start dist/main.js --name suchat-backend"
    echo "     pm2 save"
    echo ""
    echo "운영 환경 체크리스트:"
    echo "  - [ ] .env 파일의 모든 설정 확인"
    echo "  - [ ] 데이터베이스 연결 확인"
    echo "  - [ ] Redis 연결 확인"
    echo "  - [ ] HTTPS 설정 (프로덕션 필수)"
    echo "  - [ ] 방화벽 설정 확인"
fi

echo ""

