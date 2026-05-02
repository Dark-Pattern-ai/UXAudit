from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.ocr.extractor import extract_text_from_image
from app.inference import run_inference
from app.llm.verifier import verify_with_llm
import uvicorn
import json
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="UXAudit Dark Pattern Detection API",
    version="MVP-v1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health_check():
    return {
        "status": "healthy",
        "version": "MVP-v1.0",
        "modules": ["OCR", "Rule Engine", "Gemini LLM", "Report Builder"]
    }

@app.post("/analyze")
async def analyze_image(file: UploadFile = File(...)):
    try:
        image_bytes = await file.read()

        # 1단계: OCR
        ocr_result = extract_text_from_image(image_bytes)
        ocr_text = ocr_result.get("full_text", "")

        # 2단계: ML 추론
        ml_result = run_inference(image_bytes, ocr_text)

        # 3단계: LLM 검증 (다크패턴 여부 관계없이 항상 실행)
        rule_results = {
            "has_dark_pattern": ml_result.get("is_dark_pattern", False),
            "predicted_category": ml_result.get("predicted_category", "UNKNOWN"),
            "dark_probability": ml_result.get("dark_probability", 0.0),
            "detections": []
        }

        llm_result = await verify_with_llm(
            image_bytes=image_bytes,
            ocr_text=ocr_text,
            rule_results=rule_results
        )

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = file.filename or "unknown"

        # LLM 결과 파싱
        is_dark = llm_result.get("is_dark_pattern", ml_result.get("is_dark_pattern", False))
        confidence = llm_result.get("confidence", ml_result.get("dark_probability", 0.0))
        patterns = llm_result.get("patterns_detected", [])
        severity = llm_result.get("overall_severity", "NONE")
        summary = llm_result.get("executive_summary", "분석 완료")
        recommendation = llm_result.get("recommendation", "")

        result = {
            "metadata": {
                "filename": filename,
                "analyzed_at": datetime.now().isoformat(),
                "pipeline_version": "MVP-v1.0",
                "stages_used": ["OCR", "ML-Inference", "LLM-Verification"]
            },
            "final_result": {
                "is_dark_pattern": is_dark,
                "confidence_score": confidence,
                "overall_severity": severity,
                "executive_summary": summary,
                "recommendation": recommendation
            },
            "detailed_analysis": {
                "patterns_detected": patterns,
                "user_impact": summary,
                "evidence_found": [p.get("evidence", "") for p in patterns]
            },
            "stage_results": {
                "ocr": {
                    "text_extracted": ocr_text[:500],
                    "blocks_count": ocr_result.get("total_blocks", 0),
                    "success": True
                },
                "ml_inference": {
                    "predicted_category": ml_result.get("predicted_category", "UNKNOWN"),
                    "dark_probability": ml_result.get("dark_probability", 0.0),
                    "is_dark_pattern": ml_result.get("is_dark_pattern", False),
                    "success": True
                },
                "llm_verification": {
                    "success": "error" not in llm_result,
                    "model_used": llm_result.get("model_used", "gemini-2.5-flash"),
                    "error": llm_result.get("error", None)
                }
            }
        }

        # 결과 저장
        local_save = os.path.join(os.path.dirname(__file__), "results")
        os.makedirs(local_save, exist_ok=True)
        save_path = os.path.join(local_save, f"{filename}_{timestamp}.json")
        with open(save_path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
