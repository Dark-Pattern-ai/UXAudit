from google import genai
from google.genai import types
import json
import os
import time
from dotenv import load_dotenv
from typing import Dict

# 환경변수 로드 및 Gemini API 설정
load_dotenv(override=True)
os.environ.pop("GOOGLE_API_KEY", None)
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def create_analysis_prompt(ocr_text: str, rule_results: Dict) -> str:
    """Gemini용 다크패턴 분석 프롬프트 생성"""
    
    detected_patterns = rule_results.get("detections", [])
    
    if detected_patterns:
        rule_summary = "\n".join([
            f"- {d['pattern_name']} (심각도: {d['severity']}, 키워드: {d['matched_keywords'][:3]})"
            for d in detected_patterns
        ])
    else:
        rule_summary = "규칙 기반 탐지에서 명확한 다크패턴 발견되지 않음"

    return f"""
당신은 UX 다크패턴 전문 분석가입니다.
웹페이지 스크린샷을 분석하여 사용자를 속이거나 조작하려는 다크패턴을 탐지해주세요.

## 1차 분석 결과 (OCR + 규칙 엔진)
**추출된 텍스트:** {ocr_text[:400]}...

**규칙 기반 탐지 결과:**
{rule_summary}

## 판단 기준
다크패턴은 정보의 참/거짓이 아니라 아래 기준으로 판단합니다:
- UI 구성과 디자인이 사용자에게 심리적 압박을 가하는가?
- 중요 정보(추가 비용, 자동결제 등)가 숨겨져 있는가?
- 사용자의 합리적 의사결정을 방해하는 시각적 조작이 있는가?
- 거절/취소 버튼이 의도적으로 눈에 띄지 않게 설계되었는가?

## 다크패턴 유형 분류
- urgency: 긴박감 조성 (카운트다운, 수량 제한 강조)
- hidden_cost: 숨겨진 비용 (배송비, 수수료 등)
- confirm_shaming: 수치심 유발 거절 버튼
- subscription_trap: 구독 함정 (자동결제, 해지 어려움)
- misdirection: 주의 분산 (중요 정보 숨기기)
- roach_motel: 탈출 어려움 (가입은 쉽고 해지는 어렵게)

## 요청사항
위 스크린샷을 직접 보고 다음을 수행해주세요:

1. **최종 판단**: 실제 다크패턴 존재 여부 확인
2. **패턴 분류**: 발견된 다크패턴을 위 유형으로 분류
3. **구체적 근거**: 스크린샷에서 발견한 구체적 증거 제시
4. **사용자 피해**: 이로 인한 사용자 피해 설명
5. **개선 방안**: 정직한 UI로 바꾸는 방법 제안

**응답 형식 (반드시 JSON만 출력):**
{{
  "is_dark_pattern": true,
  "confidence": 0.85,
  "patterns_detected": [
    {{
      "type": "urgency",
      "name": "긴박감 조성",
      "evidence": "화면에서 발견한 구체적 증거",
      "severity": "HIGH",
      "user_harm": "사용자에게 미치는 피해",
      "improvement": "개선 제안"
    }}
  ],
  "overall_severity": "HIGH",
  "executive_summary": "2-3문장으로 요약",
  "recommendation": "전체적인 개선 권고사항"
}}
"""

async def verify_with_llm(image_bytes: bytes, ocr_text: str, rule_results: Dict) -> Dict:
    """
    Gemini 이미지 분석 모델로 직접 분석 + 최종 검증 (재시도 로직 포함)
    """
    content = ""
    max_retries = 3

    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=[
                    types.Part.from_bytes(
                        data=image_bytes,
                        mime_type='image/png'
                    ),
                    create_analysis_prompt(ocr_text, rule_results)
                ]
            )

            content = response.text.strip()

            # JSON 추출 (```json 태그 제거)
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()

            result = json.loads(content)
            result["model_used"] = "gemini-2.5-flash"
            return result

        except json.JSONDecodeError as e:
            return {
                "is_dark_pattern": rule_results.get("has_dark_pattern", False),
                "error": f"JSON 파싱 실패: {str(e)}",
                "raw_response": content,
                "confidence": 0.0,
                "patterns_detected": [],
                "executive_summary": "LLM 응답 파싱 실패",
                "recommendation": "재시도 필요"
            }

        except Exception as e:
            error_str = str(e)
            # 429 쿼터 초과면 재시도
            if ("429" in error_str or "503" in error_str) and attempt < max_retries - 1:
                wait_time = (2 ** attempt) * 15  # 15s → 30s → 60s
                print(f"[LLM] 429 에러, {wait_time}초 후 재시도... ({attempt+1}/{max_retries})")
                time.sleep(wait_time)
                continue
            # 그 외 에러는 바로 반환
            return {
                "is_dark_pattern": False,
                "error": f"Gemini API 호출 실패: {error_str}",
                "confidence": 0.0,
                "patterns_detected": [],
                "executive_summary": "API 호출 실패",
                "recommendation": "API 키 및 네트워크 확인 필요"
            }
