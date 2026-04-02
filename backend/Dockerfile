# ── Backend Dockerfile ────────────────────────────────
# Node.js 20 LTS (Alpine: 가벼운 리눅스 베이스)

FROM node:20-alpine

# tesseract.js가 내부적으로 사용하는 시스템 패키지 설치
RUN apk add --no-cache \
    python3 \
    make \
    g++

WORKDIR /app

# 의존성 먼저 설치 (레이어 캐시 활용 — 코드 변경 시 재설치 방지)
COPY package.json ./
RUN npm install --production

# 소스 복사
COPY . .

EXPOSE 3000

# 실제 AI 서버와 연동 시 USE_MOCK_AI는 docker-compose에서 주입
CMD ["node", "server.js"]
