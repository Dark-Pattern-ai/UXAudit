# UXAudit — AI 기반 다크패턴 탐지형 UX 진단 시스템

> **2026 한국정보기술학회 하계 종합학술대회** 게재 논문 기반 구현체  
> "AI 기반 다크패턴 탐지형 UX 진단 시스템 개발"  
> 엄지영, 김민아, 염정명, 최지우, 정태웅, 쩐꾸앙둥, 이한용 (경기대학교)

---

## 개요

온라인 서비스의 UI/UX 화면에서 **다크패턴(Dark Pattern)** 을 자동으로 탐지하고, 탐지 유형·판단 근거·위험도·개선 방안을 포함한 진단 리포트를 생성하는 시스템입니다.

모든 이미지를 LLM 단독으로 처리하는 방식의 비용 및 할루시네이션 문제를 보완하기 위해, **OCR → 멀티모달 분류 모델 → LLM** 으로 구성된 3단계 하이브리드 구조를 채택하였습니다.

---

## 탐지 다크패턴 유형

| 범주 | 설명 | 세부 예시 |
|------|------|-----------|
| **오도형** (Misleading) | 거짓 정보·교묘한 문구로 착각·실수 유도 | 설명 절차 과도 축약, 속임수 질문, 허위광고 |
| **방해형** (Obstructing) | 합리적 선택을 방해하는 정보 구조 | 취소·탈퇴 방해, 숨겨진 정보, 가격비교 방해 |
| **압박형** (Pressuring) | 심리적 압박으로 특정 행동 유도 | 계약 중 지속적 광고, 반복 간섭, 감정적 언어 |
| **편취 유도형** (Exploiting) | 불투명한 인터페이스로 예상치 못한 지출 유도 | 순차공개 가격책정 |

---

## 시스템 아키텍처

```
UI 이미지 입력
      │
      ▼
  [1단계] OCR (EasyOCR)
      │  텍스트 추출 → 규칙 엔진 1차 필터링
      │
      ▼
  [2단계] 멀티모달 분류 모델
      │  ┌─────────────────────────────────┐
      │  │ 텍스트 임베딩: KLUE-RoBERTa     │
      │  │ 이미지 임베딩: SigLIP           │
      │  │ 분류기: Logistic Regression     │
      │  └─────────────────────────────────┘
      │  → 다크패턴 여부 이진 분류 + 대분류 confidence
      │
      ▼
  [3단계] LLM (Gemini)
         → 세부 유형 분류 + 근거 분석 + 위험도 계산 + 개선안 생성
         → 최종 리포트 출력
```

### 위험도 산정 방식

각 UI 화면의 위험도 점수: `S = P × Wc × αs`

| 항목 | 설명 |
|------|------|
| `P` | 멀티모달 모델의 다크패턴 확률 |
| `Wc` | 유형별 카테고리 가중치 (편취 1.0 / 압박 0.8 / 오도 0.6 / 방해 0.4) |
| `αs` | LLM 심각도 배율 (HIGH 1.5 / MEDIUM 1.0 / LOW 0.5) |

전체 Risk Score (0~100 정규화):

| 점수 | 등급 |
|------|------|
| 0–20 | 안전 |
| 21–40 | 주의 |
| 41–60 | 경고 |
| 61–80 | 위험 |
| 81–100 | 매우 위험 |

---

## 모델 성능

총 1,900장 UI 데이터, EasyOCR 텍스트 추출 기반 실험 결과:

| 실험 | 텍스트 임베딩 | 이미지 임베딩 | Accuracy | Macro F1 | Dark Recall |
|------|-------------|-------------|----------|----------|-------------|
| Exp 1 | mBERT | CLIP | 0.7438 | 0.7148 | 0.8586 |
| Exp 2 | KLUE-RoBERTa | CLIP | 0.7625 | 0.7138 | 0.9495 |
| **Exp 3 (채택)** | **KLUE-RoBERTa** | **SigLIP** | **0.7812** | **0.7468** | 0.9293 |

---

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| Frontend | React + Vite (TypeScript) |
| Backend | Node.js + Express + Prisma |
| AI Server | Python + FastAPI + PyTorch |
| Database | PostgreSQL 16 |
| 인프라 | Docker Compose |

### AI Server 주요 라이브러리
- `easyocr` — OCR 텍스트 추출
- `transformers` — KLUE-RoBERTa 텍스트 임베딩
- `torch` / `torchvision` — SigLIP 이미지 임베딩
- `scikit-learn` — Logistic Regression 분류기
- `google-genai` — Gemini LLM 연동

---

## 실행 방법

### Docker Compose (권장)

```bash
# 프로젝트 루트에서
docker compose up --build
```

| 서비스 | URL |
|--------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000 |
| AI Server | http://localhost:8000 |
| PostgreSQL | localhost:5432 |

### 로컬 개발 (서비스별 개별 실행)

```bash
# 1. DB (Docker 필요)
docker compose up postgres -d

# 2. AI Server
cd ai-server
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# 3. Backend
cd backend
npm install
npm run dev          # 실제 AI 서버 연결
npm run dev:mock     # Mock AI로 테스트

# 4. Frontend
cd front
npm install
npm run dev
```

### 환경 변수

`ai-server/.env` 파일 생성 후 Gemini API 키 설정:

```env
GEMINI_API_KEY=your_api_key_here
```

---

## 프로젝트 구조

```
UXAudit/
├── ai-server/          # Python FastAPI — OCR·멀티모달·LLM 처리
│   ├── app/            # API 라우터
│   ├── models/         # 학습된 분류 모델
│   └── main.py
├── backend/            # Node.js — 비즈니스 로직 · DB 연동
│   ├── routes/
│   ├── services/
│   ├── prisma/         # DB 스키마
│   └── server.js
├── front/              # React — 진단 대시보드 UI
│   └── src/
│       ├── pages/
│       └── components/
└── docker-compose.yml
```

---

## 논문

> 엄지영, 김민아, 염정명, 최지우, 정태웅, 쩐꾸앙둥, 이한용,  
> "AI 기반 다크패턴 탐지형 UX 진단 시스템 개발",  
> *2026 한국정보기술학회 하계 종합학술대회 논문집*

본 연구는 과학기술정보통신부 및 정보통신기획평가원의 SW중심대학지원사업의 연구결과로 수행되었음 (2021-0-01393)
