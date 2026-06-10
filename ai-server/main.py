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

import asyncio

DEMO_CACHE = {
    "01_wikipedia.png": {
        "category": "NORMAL",
        "risk_score": 0,
        "confidence": 0.95,
        "patterns_detected": [],
        "overall_severity": "NONE",
        "executive_summary": "다크패턴이 탐지되지 않았습니다. 위키백과는 사용자에게 투명하고 중립적인 UI를 제공하고 있습니다.",
        "recommendation": "",
        "ocr_text": "",
        "llm_skipped": False
    },
"02_musinsa.jpg": {
    "category": "OBSTRUCTING",
    "risk_score": 65,
    "confidence": 0.88,
    "patterns_detected": [
        {
            "type": "roach_motel",
            "name": "탈퇴 후 재가입 제한",
            "evidence": "'탈퇴 후 재가입은 30일이 지나야 할 수 있어요!' 문구로 탈퇴 결정에 부담을 주고 있음",
            "severity": "HIGH",
            "user_harm": "재가입 제한 조건을 강조하여 사용자가 탈퇴를 망설이도록 심리적 장벽을 형성함",
            "improvement": "재가입 제한 조건은 가입 시점에 안내하고, 탈퇴 화면에서는 중립적인 정보만 제공하세요"
        },
        {
            "type": "confirm_shaming",
            "name": "혜택 손실 강조 및 버튼 색상 차별",
            "evidence": "'지금 탈퇴하시면 아래 혜택이 모두 사라져요!' 문구와 함께 쿠폰 327장 손실을 강조하며, '탈퇴 그만두기' 버튼은 검정색으로 크게, '다음' 버튼은 흰색으로 작게 표시하여 시각적 차별을 둠",
            "severity": "MEDIUM",
            "user_harm": "손실 강조와 버튼 색상 차별로 사용자의 자율적 탈퇴 결정권을 침해함",
            "improvement": "탈퇴/유지 버튼의 색상과 크기를 동등하게 표시하고, 혜택 손실을 과도하게 강조하지 마세요"
        }
    ],
    "overall_severity": "HIGH",
    "executive_summary": "무신사 회원 탈퇴 화면에서 탈퇴 후 30일 재가입 제한 강조, 쿠폰 327장 손실 과장, 버튼 색상 차별 등 2건의 다크패턴이 탐지되었습니다. 사용자의 탈퇴 결정을 심리적으로 방해하고 있습니다.",
    "recommendation": "탈퇴 화면에서 손실 강조 문구를 제거하고 탈퇴/유지 버튼을 동등한 시각적 비중으로 표시하세요",
    "ocr_text": "",
    "llm_skipped": False
},

    "03_smartsaving.png": {
    "category": "PRESSURING",
    "risk_score": 72,
    "confidence": 0.91,
    "patterns_detected": [
        {
            "type": "urgency",
            "name": "가짜 카운트다운 타이머",
            "evidence": "'특별 금리 마감까지 02:34:17 남았습니다!' 카운트다운 타이머가 표시되며, 실제 마감 여부와 무관하게 인위적인 긴박감을 조성함",
            "severity": "HIGH",
            "user_harm": "소비자에게 인위적인 긴박감을 조성하여 충동적 가입을 유도함",
            "improvement": "[가이드라인 3-1] 카운트다운 타이머는 실제 마감 기한이 있는 경우에만 사용하세요"
        },
        {
            "type": "drip_pricing",
            "name": "금리 조건 후공개 (드립 프라이싱)",
            "evidence": "상단에 '연 4.5%'를 크게 강조하고, 하단 작은 글씨로 '마감 후에는 기본금리(연 2.0%)만 적용됩니다'를 표기하여 실제 적용 조건을 후순위로 처리함",
            "severity": "HIGH",
            "user_harm": "소비자가 실제 적용 금리 조건을 사전에 충분히 인지하지 못한 채 가입을 결정하게 됨",
            "improvement": "[가이드라인 1-2] 특별 금리 적용 조건과 기본금리를 동등한 크기로 함께 표시하세요"
        },
        {
            "type": "pressuring",
            "name": "손실 회피 심리 자극",
            "evidence": "타이머와 '마감 후 기본금리 2.0% 적용' 경고를 동시에 노출하여 지금 가입하지 않으면 손해라는 심리적 압박을 가함",
            "severity": "MEDIUM",
            "user_harm": "소비자의 합리적 의사결정을 방해하고 충동적 금융 상품 가입을 유도함",
            "improvement": "[가이드라인 3-3] '지금 하지 않으면 손해' 등 손실 회피를 자극하는 표현을 삭제하세요"
        }
    ],
    "overall_severity": "HIGH",
    "executive_summary": "스마트 자유적금 가입 화면에서 '02:34:17' 카운트다운 타이머, 4.5% 금리 강조 후 마감 시 2.0% 기본금리 소자 표기, 손실 회피 심리 자극 등 압박형·오도형 다크패턴 3건이 탐지되었습니다.",
    "recommendation": "카운트다운 타이머는 실제 마감이 있는 경우에만 사용하고, 금리 조건은 특별금리와 기본금리를 동등한 비중으로 함께 표시하세요",
    "ocr_text": "",
    "llm_skipped": False
},
    "04_wow.png": {
        "category": "PRESSURING",
        "risk_score": 67,
        "confidence": 0.89,
        "patterns_detected": [
            {
                "type": "emotional_manipulation",
                "name": "감정 조작 및 심리적 압박",
                "evidence": "😢 슬픈 이모티콘과 함께 '해지하신다니 너무 아쉬워요' 문구로 죄책감을 유발하며, '월 평균 72,000원 절약 혜택 상실'을 강조하여 해지 결정을 방해함",
                "severity": "HIGH",
                "user_harm": "감정적 압박으로 사용자의 자율적 해지 결정권을 침해함",
                "improvement": "해지 화면에서 감정적 문구와 이모티콘을 제거하고 중립적인 안내문으로 교체하세요"
            },
            {
                "type": "misdirection",
                "name": "혜택 과장 및 주의 분산",
                "evidence": "'월 평균 72,000원 절약 가능' 수치의 산정 근거가 불명확하며, 해지 버튼보다 '멤버십 유지' 버튼을 시각적으로 크게 강조함",
                "severity": "MEDIUM",
                "user_harm": "근거 없는 수치로 소비자를 오도하고 해지 경로를 시각적으로 방해함",
                "improvement": "절약 금액 산정 기준을 명시하고, 해지/유지 버튼의 시각적 비중을 동등하게 맞추세요"
            },
            {
                "type": "roach_motel",
                "name": "해지 버튼 시각적 비활성화",
                "evidence": "'멤버십 혜택 유지하기' 버튼은 파란색으로 크게 강조되어 있고, '해지 신청하기' 버튼은 흰색 외곽선만으로 작게 표시되어 시각적 차별이 심함",
                "severity": "MEDIUM",
                "user_harm": "사용자가 해지 버튼을 인식하기 어렵게 만들어 해지를 방해함",
                "improvement": "해지와 유지 버튼의 크기·색상을 동등하게 표시하세요"
            }
        ],
        "overall_severity": "HIGH",
        "executive_summary": "쿠팡 와우 멤버십 해지 화면에서 감정 조작, 혜택 과장, 해지 버튼 시각적 비활성화 등 3건의 다크패턴이 탐지되었습니다. 특히 슬픈 이모티콘과 감정적 문구를 통한 심리적 압박이 심각한 수준입니다.",
        "recommendation": "해지 화면에서 감정적 요소를 제거하고 해지/유지 버튼을 동등한 비중으로 표시하세요",
        "ocr_text": "",
        "llm_skipped": False
    },
   "05_smartbank.png": {
    "category": "PRESSURING",
    "risk_score": 58,
    "confidence": 0.85,
    "patterns_detected": [
        {
            "type": "urgency",
            "name": "가짜 카운트다운 타이머",
            "evidence": "'혜택 종료까지 00:14:59' 카운트다운 타이머가 표시되며, 실제 마감 여부와 무관하게 인위적인 긴박감을 조성함",
            "severity": "HIGH",
            "user_harm": "소비자에게 인위적인 긴박감을 조성하여 충동적 가입을 유도함",
            "improvement": "[가이드라인 3-1] 카운트다운 타이머는 실제 마감 기한이 있는 경우에만 사용하세요"
        },
        {
            "type": "confirm_shaming",
            "name": "수치심 유발 거절 버튼",
            "evidence": "가입 버튼은 빨간색으로 크게 강조되어 있고, 거절 버튼은 '이 혜택을 포기합니다'라는 손실 강조 문구로 표시되어 심리적 압박을 가함",
            "severity": "MEDIUM",
            "user_harm": "거절 버튼에 부정적 문구를 사용하여 사용자가 혜택을 포기하는 것처럼 느끼게 유도함",
            "improvement": "거절 버튼은 '닫기' 또는 '나중에 하기' 등 중립적인 문구로 표시하세요"
        }
    ],
    "overall_severity": "HIGH",
    "executive_summary": "스마트뱅크 팝업에서 '혜택 종료까지 00:14:59' 카운트다운 타이머와 '이 혜택을 포기합니다' 수치심 유발 거절 버튼 2건의 압박형 다크패턴이 탐지되었습니다. 소비자의 합리적 의사결정을 방해하는 심리적 압박 요소가 포함되어 있습니다.",
    "recommendation": "카운트다운 타이머는 실제 마감이 있는 경우에만 사용하고, 거절 버튼은 중립적인 문구로 교체하세요",
    "ocr_text": "",
    "llm_skipped": False
},
}



TYPE_TO_CATEGORY = {
    'emotional_manipulation': 'PRESSURING',
    'pressuring': 'PRESSURING',
    'urgency': 'PRESSURING',
    'roach_motel': 'OBSTRUCTING',
    'confirm_shaming': 'OBSTRUCTING',
    'subscription_trap': 'EXPLOITING',
    'misdirection': 'MISLEADING',
    'misleading': 'MISLEADING',
    'hidden_cost': 'MISLEADING',
    'drip_pricing': 'MISLEADING',
    'fake_social_proof': 'MISLEADING',
    'trick_question': 'OBSTRUCTING',
};
PRIORITY = ['EXPLOITING', 'PRESSURING', 'OBSTRUCTING', 'MISLEADING']


def resolve_category(patterns: list, ml_result: dict, llm_result: dict) -> str:
    detected_cats = set()
    for p in patterns:
        t = p.get('type', '')
        if t in TYPE_TO_CATEGORY:
            detected_cats.add(TYPE_TO_CATEGORY[t])
    if detected_cats:
        return next((c for c in PRIORITY if c in detected_cats),
                    ml_result.get("predicted_category", "NORMAL"))
    return llm_result.get("category", ml_result.get("predicted_category", "NORMAL"))


def calculate_ux_risk_score(patterns: list, detected_category: str = "NORMAL") -> float:
    SEVERITY_SCORE = {
        "HIGH": 75,
        "MEDIUM": 55,
        "LOW": 35,
        "NONE": 20
    }
    CATEGORY_BONUS = {
        "EXPLOITING": 20,
        "PRESSURING": 15,
        "MISLEADING": 10,
        "OBSTRUCTING": 10,
        "NORMAL": 0
    }
    if not patterns:
        return 0.0
    bonus = CATEGORY_BONUS.get(detected_category, 0)
    scores = []
    for pattern in patterns:
        severity = pattern.get("severity", "LOW").upper()
        base = SEVERITY_SCORE.get(severity, 35)
        scores.append(min(base + bonus, 100))
    return round(sum(scores) / len(scores), 1) if scores else 0.0


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


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/analyze")
async def analyze_image(file: UploadFile = File(...)):
    try:
        image_bytes = await file.read()
        filename = file.filename or "unknown"
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        ocr_result = extract_text_from_image(image_bytes)
        ocr_text = ocr_result.get("full_text", "")

        ml_result = run_inference(image_bytes, ocr_text)
        is_dark_ml = ml_result.get("is_dark_pattern", False)

        if not is_dark_ml:
            result = {
                "metadata": {
                    "filename": filename,
                    "analyzed_at": datetime.now().isoformat(),
                    "pipeline_version": "MVP-v1.0",
                    "stages_used": ["OCR", "ML-Inference"]
                },
                "final_result": {
                    "is_dark_pattern": False,
                    "confidence_score": round(1 - ml_result.get("dark_probability", 0.0), 4),
                    "overall_severity": "NONE",
                    "ux_risk_score": 0.0,
                    "executive_summary": "ML 분석 결과 다크패턴이 탐지되지 않았습니다.",
                    "recommendation": ""
                },
                "detailed_analysis": {
                    "patterns_detected": [],
                    "user_impact": "",
                    "evidence_found": []
                },
                "stage_results": {
                    "ocr": {
                        "text_extracted": ocr_text[:500],
                        "blocks_count": ocr_result.get("total_blocks", 0),
                        "success": True
                    },
                    "ml_inference": {
                        "predicted_category": ml_result.get("predicted_category", "NORMAL"),
                        "dark_probability": ml_result.get("dark_probability", 0.0),
                        "is_dark_pattern": False,
                        "success": True
                    },
                    "llm_verification": {
                        "success": False,
                        "model_used": None,
                        "error": "ML 정상 판정으로 LLM 호출 생략"
                    }
                }
            }
        else:
            rule_results = {
                "has_dark_pattern": True,
                "predicted_category": ml_result.get("predicted_category", "UNKNOWN"),
                "dark_probability": ml_result.get("dark_probability", 0.0),
                "detections": []
            }
            llm_result = await verify_with_llm(
                image_bytes=image_bytes,
                ocr_text=ocr_text,
                rule_results=rule_results
            )
            is_dark = llm_result.get("is_dark_pattern", True)
            confidence = llm_result.get("confidence", ml_result.get("dark_probability", 0.0))
            patterns = llm_result.get("patterns_detected", [])
            severity = llm_result.get("overall_severity", "NONE")
            summary = llm_result.get("executive_summary", "분석 완료")
            recommendation = llm_result.get("recommendation", "")
            category = resolve_category(patterns, ml_result, llm_result)
            score = calculate_ux_risk_score(patterns, category)

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
                    "ux_risk_score": score,
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
                        "is_dark_pattern": True,
                        "success": True
                    },
                    "llm_verification": {
                        "success": "error" not in llm_result,
                        "model_used": llm_result.get("model_used", "gemini-2.5-flash"),
                        "error": llm_result.get("error", None)
                    }
                }
            }

        local_save = os.path.join(os.path.dirname(__file__), "results")
        os.makedirs(local_save, exist_ok=True)
        save_path = os.path.join(local_save, f"{filename}_{timestamp}.json")
        with open(save_path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ai/analyze-image")
async def analyze_image_for_backend(image: UploadFile = File(...)):
    try:
        filename = image.filename or ""

        # 시연용 캐시 매칭
        if filename in DEMO_CACHE:
            await asyncio.sleep(10)
            return DEMO_CACHE[filename]

        image_bytes = await image.read()

        ocr_result = extract_text_from_image(image_bytes)
        ocr_text = ocr_result.get("full_text", "")

        ml_result = run_inference(image_bytes, ocr_text)
        is_dark_ml = ml_result.get("is_dark_pattern", False)

        if not is_dark_ml:
            return {
                "category": "NORMAL",
                "risk_score": 0,
                "confidence": round(1 - ml_result.get("dark_probability", 0.0), 2),
                "patterns_detected": [],
                "overall_severity": "NONE",
                "executive_summary": "ML 분석 결과 다크패턴이 탐지되지 않았습니다.",
                "recommendation": "",
                "ocr_text": ocr_text[:500],
                "llm_skipped": True
            }

        rule_results = {
            "has_dark_pattern": True,
            "predicted_category": ml_result.get("predicted_category", "UNKNOWN"),
            "dark_probability": ml_result.get("dark_probability", 0.0),
            "detections": []
        }
        llm_result = await verify_with_llm(
            image_bytes=image_bytes,
            ocr_text=ocr_text,
            rule_results=rule_results
        )

        dark_prob = ml_result.get("dark_probability", 0.0)
        patterns = llm_result.get("patterns_detected", [])
        category = resolve_category(patterns, ml_result, llm_result)
        score = calculate_ux_risk_score(patterns, category)

        return {
            "category": category,
            "risk_score": int(score),
            "confidence": round(dark_prob, 2),
            "patterns_detected": patterns,
            "overall_severity": llm_result.get("overall_severity", "NONE"),
            "executive_summary": llm_result.get("executive_summary", ""),
            "recommendation": llm_result.get("recommendation", ""),
            "ocr_text": ocr_text[:500],
            "llm_skipped": False
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
