# ── Backend Dockerfile ────────────────────────────────
# Node.js 20 LTS (Alpine: 가벼운 리눅스 베이스)

FROM node:20-alpine

WORKDIR /app

# Prisma가 Alpine에서 동작할 때 필요한 런타임 라이브러리
RUN apk add --no-cache openssl

# 의존성 먼저 설치 (레이어 캐시 활용 — 코드 변경 시 재설치 방지)
COPY package*.json ./
RUN npm install

# Prisma schema 먼저 복사 후 Client 생성
COPY prisma ./prisma
RUN npx prisma generate

# 소스 복사
COPY . .

EXPOSE 3000

# 실제 AI 서버와 연동 시 USE_MOCK_AI는 docker-compose에서 주입
CMD ["node", "server.js"]
