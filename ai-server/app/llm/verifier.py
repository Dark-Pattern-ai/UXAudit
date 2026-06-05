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
당신은 온라인 서비스(금융·커머스·앱 등) UI/UX 다크패턴 전문 분석가입니다.
아래 이미지와 텍스트를 직접 분석하여 실제로 다크패턴이 존재하는지 판단하세요.

## 1차 분석 결과 (참고용)
**추출된 텍스트:** {ocr_text[:400]}

**규칙 기반 탐지 결과 (참고만 할 것, 맹신 금지):**
{rule_summary}

## 판단 기준
1차 분석 결과는 참고용입니다. 반드시 이미지를 직접 보고 아래 기준으로 독립적으로 판단하세요.

### 다크패턴으로 판단하는 경우
**[오도형 – MISLEADING]**
- 중요 가격·조건 정보를 의도적으로 작은 글씨로 처리했는가
- 할인가만 크게 표시하고 실제 총 결제액(배송비 포함)을 숨기거나 나중에 공개하는가
- 근거 없는 "최저가", "무조건", "항상" 등 절대적 표현을 사용했는가
- 리뷰 수·평점을 조작하거나 근거 없이 과장했는가

**[방해형 – OBSTRUCTING]**
- 취소·해지·환불 버튼이 의도적으로 숨겨지거나 비활성화되어 있는가
- 구독 해지를 위해 불필요하게 많은 단계를 거치게 만드는가
- 고객센터 전화 연결만으로 해지를 제한하는가

**[압박형 – PRESSURING]**
- 실제 마감이 없는 카운트다운 타이머가 있는가
- 실재하지 않는 재고 부족·한정 수량으로 긴박감을 조성하는가
- "지금 사지 않으면 손해", "오늘만 이 가격" 등 공포/손실 회피 마케팅이 있는가
- 다른 사용자의 구매 행동 알림으로 압박을 주는가 (예: "방금 3명이 구매했습니다")

**[편취유도형 – EXPLOITING]**
- 상품 가격과 배송비를 분리 표시하여 최종 결제액이 처음 가격보다 크게 증가하는가 (Drip Pricing)
- 배송비가 상품 가격보다 높거나 비합리적으로 책정되어 있는가
- 동의 없는 자동갱신·추가 상품이 기본 선택되어 있는가
- 체크박스가 기본값으로 체크되어 있는가

### 다크패턴이 아닌 경우 (오탐 주의)
- 일반적인 본인인증, 비밀번호 찾기 등 표준 절차
- 실제 마감이 있는 기간 한정 이벤트 표시
- 투명하게 표시된 정상적인 배송비·수수료 안내
- 표준적인 로그인/회원가입 UI

## 다크패턴 유형 코드 (type 필드에 사용)
- urgency: 가짜 긴박감 (실제 마감 없는 카운트다운·한정 문구)
- hidden_cost: 숨겨진 비용·드립 프라이싱 (배송비, 수수료 후공개)
- drip_pricing: 순차 공개 가격책정 (최종 가격이 단계별로 증가)
- confirm_shaming: 수치심 유발 거절 버튼
- subscription_trap: 구독 함정 (자동갱신, 해지 방해)
- misdirection: 주의 분산 (중요 정보 숨기기·시각적 조작)
- roach_motel: 탈출 방해 (가입은 쉽고 해지는 어렵게)
- fake_social_proof: 가짜 사회적 증거 (조작된 리뷰·구매 알림)
- trick_question: 혼란스러운 UI 선택 (이중 부정 등)

## 응답 형식 (반드시 JSON만 출력, 한국어로 작성):
{{
  "is_dark_pattern": true,
  "confidence": 0.85,
  "patterns_detected": [
    {{
      "type": "hidden_cost",
      "name": "배송비 후공개 (Drip Pricing)",
      "evidence": "이미지에서 실제로 발견된 구체적인 증거 (예: 상품가 98,800원인데 배송비 100,000원으로 상품보다 배송비가 더 높음)",
      "severity": "HIGH",
      "user_harm": "소비자가 최종 결제 금액을 미리 파악하기 어려워 예상치 못한 비용을 지불하게 됨",
      "improvement": "상품 상세 페이지 첫 화면에 배송비를 포함한 총 결제 예상 금액을 명시하세요"
    }}
  ],
  "overall_severity": "HIGH",
  "executive_summary": "이미지에서 발견된 내용을 구체적으로 언급하며 2-3문장으로 요약",
  "recommendation": "전체적인 개선 권고사항"
}}

**중요 지침:**
1. evidence 필드에는 이미지에서 실제로 확인한 구체적인 수치·문구·UI 요소를 반드시 기술하세요.
2. 이미지에서 실제로 확인되지 않는 다크패턴은 절대 탐지하지 마세요.
3. 확신이 없으면 is_dark_pattern을 false로 설정하세요.
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
                ],
                config=types.GenerateContentConfig(
                    temperature=0, 
                )
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
