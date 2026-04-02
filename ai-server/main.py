# ── ai-server/main.py ─────────────────────────────────
#
# AI팀 구현 가이드
#
# 백엔드가 기대하는 응답 스펙:
#   POST /ai/analyze-image
#   Body: multipart/form-data { image: File }
#   Response:
#     {
#       "category":   str,    # "NORMAL"|"MISLEADING"|"OBSTRUCTING"|"PRESSURING"|"EXPLOITING"
#       "risk_score": int,    # 0~100
#       "confidence": float   # 0.0~1.0
#     }
#
# 이 파일은 인터페이스 스펙 확인용 스텁(stub)입니다.
# 실제 CLIP + sklearn 구현으로 교체하세요.

from fastapi import FastAPI, File, UploadFile
from pydantic import BaseModel
import random

app = FastAPI(title="UXAudit AI 서버")

CATEGORIES = ["NORMAL", "MISLEADING", "OBSTRUCTING", "PRESSURING", "EXPLOITING"]

class AnalyzeResponse(BaseModel):
    category: str
    risk_score: int
    confidence: float


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/ai/analyze-image", response_model=AnalyzeResponse)
async def analyze_image(image: UploadFile = File(...)):
    """
    이미지를 받아 다크패턴 카테고리와 위험도를 반환한다.

    TODO: 아래 스텁 응답을 실제 CLIP + sklearn 추론으로 교체하세요.
      1. image.read() 로 바이트 읽기
      2. PIL.Image 로 변환
      3. CLIP 인코더로 임베딩 추출
      4. sklearn classifier.predict() 로 카테고리 분류
      5. predict_proba() 로 confidence 계산
    """
    contents = await image.read()

    # ── 스텁 응답 (랜덤) — 실제 구현으로 교체 필요 ──
    category = random.choice(CATEGORIES)
    risk_score = 0 if category == "NORMAL" else random.randint(40, 95)
    confidence = round(random.uniform(0.75, 0.98), 2)

    return AnalyzeResponse(
        category=category,
        risk_score=risk_score,
        confidence=confidence,
    )