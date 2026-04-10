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

import os
import shutil
import tempfile
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.ocr.extractor import extract_text
from app.rules.rule_engine import run_rules, format_rule_results
from app.llm.verifier import verify_and_explain
from app.report.builder import build_report

app = FastAPI(title="UXAudit AI 서버")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ──────────────────────────────────────
#  기존 스펙 응답 모델 (백엔드 연동용)
# ──────────────────────────────────────

class AnalyzeResponse(BaseModel):
    category: str
    risk_score: int
    confidence: float


# ──────────────────────────────────────
#  헬스체크
# ──────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "version": "0.2.0"}


# ──────────────────────────────────────
#  기존 엔드포인트 (백엔드가 호출하는 API)
#  POST /ai/analyze-image
#  Body: multipart/form-data { image: File }
#  Response: { category, risk_score, confidence }
# ──────────────────────────────────────

@app.post("/ai/analyze-image", response_model=AnalyzeResponse)
async def analyze_image(image: UploadFile = File(...)):
    """
    백엔드 연동용 — 단일 이미지를 받아
    다크패턴 카테고리 + 위험도 + 신뢰도를 반환한다.
    """
    # 1. 파일 임시 저장
    file_path = os.path.join(UPLOAD_DIR, image.filename)
    with open(file_path, "wb") as f:
        shutil.copyfileobj(image.file, f)

    try:
        # 2. OCR 텍스트 추출
        ocr_result = extract_text(file_path)
        ocr_text = ocr_result["full_text"]

        # 3. Stage 1 — 규칙 기반 필터링
        rule_matches = run_rules(ocr_text)
        rule_text = format_rule_results(rule_matches)

        # 4. Stage 3 — LLM 검증
        llm_result = verify_and_explain(
            image_path=file_path,
            ocr_text=ocr_text,
            rule_results_text=rule_text,
        )

        # 5. 결과 변환 (기존 스펙에 맞춤)
        patterns = llm_result.get("patterns", [])

        if not patterns:
            category = "NORMAL"
            risk_score = 0
            confidence = 0.9
        else:
            # 최고 위험 패턴 기준
            risk_order = {"HIGH": 3, "MEDIUM": 2, "LOW": 1}
            top_pattern = max(
                patterns,
                key=lambda p: risk_order.get(p.get("risk_level", "LOW"), 0),
            )
            category = top_pattern.get("category", "NORMAL")
            risk_score = llm_result.get("overall_risk_score", 50)
            confidence = round(top_pattern.get("confidence", 0.7), 2)

        return AnalyzeResponse(
            category=category,
            risk_score=risk_score,
            confidence=confidence,
        )

    finally:
        # 임시 파일 정리 (필요 시 유지하려면 제거)
        if os.path.exists(file_path):
            os.remove(file_path)


# ──────────────────────────────────────
#  상세 리포트 엔드포인트 (프론트엔드/감독기관용)
#  POST /ai/analyze-detail
#  Body: multipart/form-data { file, service_name }
#  Response: 전체 리포트 JSON
# ──────────────────────────────────────

@app.post("/ai/analyze-detail")
async def analyze_detail(
    file: UploadFile = File(...),
    service_name: str = Form(default="분석 대상 서비스"),
):
    """
    상세 분석 — 전체 리포트 JSON을 반환한다.
    (감독기관 대시보드, 상세 결과 페이지용)
    """
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        # OCR
        ocr_result = extract_text(file_path)
        ocr_text = ocr_result["full_text"]

        # Stage 1
        rule_matches = run_rules(ocr_text)
        rule_text = format_rule_results(rule_matches)

        # Stage 3
        llm_result = verify_and_explain(
            image_path=file_path,
            ocr_text=ocr_text,
            rule_results_text=rule_text,
        )

        # 리포트 생성
        report = build_report(
            service_name=service_name,
            image_filename=file.filename,
            image_url=f"/uploads/{file.filename}",
            rule_matches=rule_matches,
            llm_result=llm_result,
        )

        # 디버그 정보
        report["_debug"] = {
            "ocr_text": ocr_text,
            "ocr_element_count": ocr_result["element_count"],
            "rule_matches": rule_matches,
        }

        return report

    finally:
        pass  # 상세 분석은 파일 유지 (리포트에서 참조)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
