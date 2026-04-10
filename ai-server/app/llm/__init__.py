# empty
import os
import json
import base64
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SYSTEM_PROMPT = """당신은 금융감독기관 소속 다크패턴 분석 전문가입니다.
스크린샷과 OCR 텍스트, 규칙 기반 필터링 결과를 종합하여 다크패턴을 검증하고 분석합니다.

다크패턴 범주:
- NORMAL: 다크패턴 없음
- MISLEADING (오도형): 거짓/왜곡 정보로 소비자를 오도
- OBSTRUCTING (방해형): 취소·해지 등 권리 행사를 방해
- PRESSURING (압박형): 심리적 압박으로 판단을 흐림
- EXPLOITING (편취유도형): 가격 정보를 순차적으로 공개하여 비용 은닉

세부 유형 (15개):
[MISLEADING] 1.설명절차의 과도한 축약 2.속임수 질문 3.잘못된 계층구조 4.특정 옵션 사전선택 5.허위광고 및 기만적 유인행위
[OBSTRUCTING] 6.취소·해지·탈퇴 방해 7.숨겨진 정보 제공 8.가격비교 방해 9.클릭 피로감 유발
[PRESSURING] 10.계약과정 중 기습적 광고 11.반복 간섭 12.감정적 언어 사용 13.감각 조작 14.다른 소비자의 활동 알림
[EXPLOITING] 15.순차공개 가격책정

반드시 JSON 형식으로 응답하세요."""

def encode_image(image_path: str) -> str:
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def verify_and_explain(
    image_path: str,
    ocr_text: str,
    rule_results_text: str,
) -> dict:
    base64_image = encode_image(image_path)

    user_prompt = f"""아래 금융 서비스 스크린샷을 분석해주세요.

## OCR 추출 텍스트
{ocr_text}

## 규칙 기반 필터링 결과
{rule_results_text}

## 분석 요청
1. 규칙 필터링 결과를 검증하세요 (오탐 여부)
2. 규칙이 놓친 추가 다크패턴이 있는지 확인하세요
3. 각 패턴에 대해 위반 근거와 개선 권고안을 작성하세요
4. 전체 위험도 점수(0-100)를 산정하세요

## 응답 형식 (JSON)
{{
  "patterns": [
    {{
      "category": "MISLEADING|OBSTRUCTING|PRESSURING|EXPLOITING",
      "pattern_id": 1-15,
      "pattern_name": "패턴명",
      "risk_level": "HIGH|MEDIUM|LOW",
      "description": "위반 상세 설명",
      "evidence": "근거",
      "recommendation": "개선 권고",
      "is_rule_detected": true/false,
      "confidence": 0.0-1.0
    }}
  ],
  "overall_risk_score": 0-100,
  "summary": "종합 분석 요약 (2-3문장)"
}}"""

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": user_prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/png;base64,{base64_image}",
                            "detail": "high",
                        },
                    },
                ],
            },
        ],
        temperature=0.2,
        max_tokens=2000,
    )

    raw = response.choices[0].message.content
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1]
    if raw.endswith("```"):
        raw = raw.rsplit("```", 1)[0]

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {
            "patterns": [],
            "overall_risk_score": 0,
            "summary": f"LLM 응답 파싱 실패. 원문: {raw[:500]}",
        }
