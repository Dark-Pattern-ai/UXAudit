# 베이스 이미지: Python 3.11이 설치된 가벼운 Linux 환경
FROM python:3.11-slim

# 컨테이너 내 작업 디렉토리 설정
WORKDIR /app

# 시스템 패키지 설치 (EasyOCR, OpenCV 의존성)
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgl1-mesa-glx \
    && rm -rf /var/lib/apt/lists/*

# Python 패키지 목록 복사 (캐시 효율성을 위해 코드보다 먼저)
COPY requirements.txt .

# Python 패키지 설치
RUN pip install --no-cache-dir -r requirements.txt

# 애플리케이션 코드 복사
COPY . .

# 포트 노출
EXPOSE 8000

# 서버 실행 명령어
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
