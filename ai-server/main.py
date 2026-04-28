from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import json
import os
from datetime import datetime

# 우리가 만든 AI 모듈들 불러오기
from app.ocr.extractor import extract_text_from_image
from app.rules.rule_engine import run_rule_engine
from app.llm.verifier import verify_with_llm
from app.report.builder import build_final_report

app = FastAPI(
    title="Dark Pattern Detector API",
    description="웹페이지 스크린샷에서 다크패턴을 탐지하는 하이브리드 AI 시스템",
    version="1.0.0"
)

# CORS 설정 (프론트엔드 연동용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ 결과 저장 함수
def save_result(filename: str, result: dict):
    os.makedirs("results", exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    base_name = os.path.splitext(filename)[0]  # 확장자 제거
    save_path = f"results/{base_name}_{timestamp}.json"
    with open(save_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"[저장] 결과 저장 완료: {save_path}")

@app.get("/")
def health_check():
    return {
        "status": "healthy",
        "message": "Dark Pattern Detector AI is ready!",
        "version": "MVP-v1.0",
        "modules": ["OCR", "Rule Engine", "Gemini LLM", "Report Builder"]
    }

@app.post("/analyze")
async def analyze_screenshot(file: UploadFile = File(...)):
    """
    메인 분석 엔드포인트: 스크린샷 → 다크패턴 분석 리포트
    하이브리드 AI 시스템 (OCR + 규칙 엔진 + Gemini LLM)
    """
    
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="이미지 파일만 업로드 가능합니다")
    
    # 파일 크기 제한 (10MB)
    image_bytes = await file.read()
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="파일 크기는 10MB 이하여야 합니다")
    
    try:
        print(f"\n[분석 시작] 파일: {file.filename}")
        
        # Stage 1: OCR 텍스트 추출
        print("[1/3] OCR 텍스트 추출 중...")
        ocr_result = extract_text_from_image(image_bytes)
        if ocr_result.get("error"):
            raise HTTPException(status_code=500, detail=f"OCR 처리 실패: {ocr_result['error']}")
        print(f"[1/3] OCR 완료: {ocr_result['total_blocks']}개 텍스트 블록 추출")
        
        # Stage 2: 규칙 기반 1차 필터링
        print("[2/3] 규칙 엔진 분석 중...")
        rule_result = run_rule_engine(ocr_result)
        print(f"[2/3] 규칙 탐지 완료: {rule_result['detection_count']}개 패턴 발견")
        
        # Stage 3: Gemini LLM 최종 검증
        print("[3/3] Gemini AI 검증 중...")
        llm_result = await verify_with_llm(
            image_bytes,
            ocr_result.get("text_extracted", ocr_result.get("full_text", "")),  # ✅ 키 통일
            rule_result
        )
        print("[3/3] LLM 검증 완료")
        
        # 최종 리포트 생성
        print("[완료] 최종 리포트 생성")
        final_report = build_final_report(ocr_result, rule_result, llm_result, file.filename)
        
        # ✅ 결과 자동 저장
        save_result(file.filename, final_report)
        
        print(f"[완료] 최종 판단: {final_report['final_result']['is_dark_pattern']}")
        return JSONResponse(content=final_report)
        
    except Exception as e:
        print(f"[오류 발생] {str(e)}")
        raise HTTPException(status_code=500, detail=f"분석 중 오류 발생: {str(e)}")

@app.post("/analyze/quick")
async def quick_analyze(file: UploadFile = File(...)):
    """
    빠른 분석 (LLM 없이 OCR + 규칙만): 테스트 및 비용 절약용
    """
    image_bytes = await file.read()
    
    ocr_result = extract_text_from_image(image_bytes)
    rule_result = run_rule_engine(ocr_result)

    result = {
        "quick_analysis": True,
        "ocr_result": ocr_result,
        "rule_result": rule_result,
        "note": "LLM 검증 없는 빠른 분석 결과입니다"
    }

    # ✅ 빠른 분석도 저장
    save_result(file.filename, result)
    
    return JSONResponse(content=result)
