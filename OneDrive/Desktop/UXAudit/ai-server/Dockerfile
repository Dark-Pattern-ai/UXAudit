# ── AI Server Dockerfile ──────────────────────────────
# Python 3.11 슬림 이미지

FROM python:3.11-slim

WORKDIR /app

# 의존성 먼저 설치
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# 소스 복사
COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
