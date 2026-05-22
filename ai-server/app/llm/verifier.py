from google import genai
from google.genai import types
import json
import os
import time
from dotenv import load_dotenv
from typing import Dict

# 환경변수 로딩 및 Gemini API 설정
load_dotenv(override=True)
os.environ.pop("GOOGLE_API_KEY", None)
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def create_analysis_prompt(ocr_text: str, rule_results: Dict) -> str:
    """Gemini용 분석 프롬프트 생성"""
    
    detected_patterns = rule_results.get("detections", [])
    
    if detected_patterns:
        rule_summary = "\n".join([
            f"- {d['pattern_name']} (심각도: {d['severity']}, 탐지어: {d['matched_keywords'][:3]})"
            for d in detected_patterns
        ])
    else:
        rule_summary = "규칙 기반 탐지에서 다크패턴 없음"

    return f"""
당신은 금융위원회 가이드라인 기반 UX 다크패턴 전문 분석가입니다.
아래 이미지와 텍스트를 직접 분석하여 실제로 다크패턴이 존재하는지 판단하세요.

## 1차 분석 결과 (참고용)
**추출된 텍스트:** {ocr_text[:400]}

**규칙 기반 탐지 결과 (참고만 할 것, 맹신 금지):**
{rule_summary}

## 중요 판단 기준
1차 분석 결과는 참고용입니다. 반드시 이미지를 직접 보고 아래 기준으로 독립적으로 판단하세요.

**다크패턴으로 판단하는 경우:**
- 실제로 존재하지 않는 긴박감을 조성하는 카운트다운/한정 문구가 있는가
- 중요 비용 정보(수수료, 금리 등)가 의도적으로 숨겨져 있는가
- 취소/해지 버튼이 의도적으로 작거나 숨겨져 있는가
- 동의 없는 자동갱신이나 사전 체크된 항목이 있는가
- 사용자의 심리를 조작하는 공포/압박 문구가 있는가

**다크패턴이 아닌 경우 (오탐 주의):**
- 일반적인 본인인증, 비밀번호 찾기 등 표준 인증 절차
- 앱 설치 안내 등 일반적인 서비스 이용 안내
- 정상적인 단계별 프로세스 안내 화면
- 표준적인 로그인/회원가입 UI

## 다크패턴 유형
- urgency: 가짜 긴박감 (실제 마감 없는 카운트다운)
- hidden_cost: 숨겨진 비용 (나중에 청구되는 수수료)
- confirm_shaming: 수치심 유발 거절 버튼
- subscription_trap: 구독 함정 (자동갱신, 해지 방해)
- misdirection: 주의 분산 (중요 정보 숨기기)
- roach_motel: 탈출 방해 (가입은 쉽고 해지는 어렵게)

## 응답 형식 (반드시 JSON만 출력):
{{
  "is_dark_pattern": true,
  "confidence": 0.85,
  "patterns_detected": [
    {{
      "type": "urgency",
      "name": "가짜 카운트다운 타이머",
      "evidence": "화면에서 발견된 실제 증거",
      "severity": "HIGH",
      "user_harm": "사용자에게 미치는 피해",
      "improvement": "개선 방안"
    }}
  ],
  "overall_severity": "HIGH",
  "executive_summary": "2-3문장으로 요약",
  "recommendation": "전체적인 개선 권고사항"
}}

**주의: 이미지에서 실제로 확인되지 않는 다크패턴은 절대 탐지하지 마세요.**
"""

async def verify_with_llm(image_bytes: bytes, ocr_text: str, rule_results: Dict) -> Dict:
    """
    Gemini 이미지 분석 및 직접 분석 + 최종 검증
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
            if ("429" in error_str or "503" in error_str) and attempt < max_retries - 1:
                wait_time = (2 ** attempt) * 15
                print(f"[LLM] 429 오류, {wait_time}초 후 재시도.. ({attempt+1}/{max_retries})")
                time.sleep(wait_time)
                continue
            return {
                "is_dark_pattern": False,
                "error": f"Gemini API 호출 실패: {error_str}",
                "confidence": 0.0,
                "patterns_detected": [],
                "executive_summary": "API 호출 실패",
                "recommendation": "API 키 및 네트워크 확인 필요"
            }
