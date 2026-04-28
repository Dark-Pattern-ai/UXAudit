from typing import Dict
from datetime import datetime

def build_final_report(
    ocr_result: Dict, 
    rule_result: Dict, 
    llm_result: Dict,
    filename: str = "unknown"
) -> Dict:
    """
    모든 분석 결과를 종합하여 최종 리포트 생성
    """
    
    # 심각도 점수 매핑
    severity_mapping = {"LOW": 1, "MEDIUM": 2, "HIGH": 3, "UNKNOWN": 0}
    
    # LLM 결과에서 최종 판단 추출
    final_decision = llm_result.get("is_dark_pattern", False)
    overall_severity = llm_result.get("overall_severity", "UNKNOWN")
    confidence = llm_result.get("confidence", 0.0)
    
    # ✅ OCR 텍스트 키 통일 (text_extracted 우선, 없으면 full_text)
    ocr_text = ocr_result.get("text_extracted", ocr_result.get("full_text", ""))
    
    return {
        "metadata": {
            "filename": filename,
            "analyzed_at": datetime.now().isoformat(),
            "pipeline_version": "MVP-v1.0",
            "stages_used": ["OCR", "Rule-Based", "LLM-Verification"]
        },
        
        "final_result": {
            "is_dark_pattern": final_decision,
            "confidence_score": confidence,
            "overall_severity": overall_severity,
            "severity_score": severity_mapping.get(overall_severity, 0),
            "executive_summary": llm_result.get("executive_summary", ""),
            "recommendation": llm_result.get("recommendation", "")
        },
        
        "detailed_analysis": {
            "patterns_detected": llm_result.get("patterns_detected", []),
            "user_impact": llm_result.get("user_impact", ""),
            "evidence_found": [p.get("evidence", "") for p in llm_result.get("patterns_detected", [])]
        },
        
        "stage_results": {
            "ocr": {
                "text_extracted": ocr_text[:200] + "...",
                "blocks_count": ocr_result.get("total_blocks", 0),
                "success": len(ocr_text) > 0
            },
            "rule_engine": {
                "detected": rule_result.get("has_dark_pattern", False),
                "total_score": rule_result.get("total_score", 0),
                "detections": rule_result.get("detections", [])
            },
            "llm_verification": {
                "success": "error" not in llm_result,
                "model_used": llm_result.get("model_used", "gemini-2.5-flash"),  # ✅ 하드코딩 제거
                "error": llm_result.get("error", None)
            }
        }
    }
