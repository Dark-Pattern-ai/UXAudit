import openai
import base64
import json
import os
from pathlib import Path
from dotenv import load_dotenv
import time

# .env에서 API 키 로드
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")
client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

PROMPT = """너는 온라인 서비스 UI 다크패턴 라벨링 전문가야.
첨부된 스크린샷은 금융 앱, 쇼핑몰, 구독 서비스, 배달 앱 등
온라인에서 상품·서비스를 판매하는 화면이야.
아래 16개 라벨 중 해당하는 것을 골라줘.

[라벨 목록]
0  NORMAL         정상 (다크패턴 없음)
1  MISLEADING     설명절차의 과도한 축약
2  MISLEADING     속임수 질문
3  MISLEADING     잘못된 계층구조
4  MISLEADING     특정 옵션 사전선택
5  MISLEADING     허위광고 및 기만적 유인행위
6  OBSTRUCTING    취소·해지·탈퇴 방해
7  OBSTRUCTING    숨겨진 정보 
8  OBSTRUCTING    가격비교 방해
9  OBSTRUCTING    클릭 피로감 유발
10 PRESSURING     계약과정 중 기습적 광고
11 PRESSURING     반복 간섭 - x 
12 PRESSURING     감정적 언어 사용
13 PRESSURING     감각 조작
14 PRESSURING     다른 소비자의 활동 알림
15 EXPLOITING     순차공개 가격책정

[판단 규칙]
- 다크패턴이 없으면 반드시 0을 선택해.
- 다크패턴이 여러 개 보이면, 사용자가 가장 먼저 속거나 불편을 느낄 요소를 primary로 골라.
- 두 번째로 눈에 띄는 패턴이 있으면 secondary에 넣어. 없으면 null.
- 감각 조작(13)은 정적 스크린샷으로는 판단이 어려우니, 깜빡임/애니메이션 흔적이 보이지 않으면 선택하지 마.
- 금융 서비스뿐 아니라 쇼핑몰, 구독, 배달 등 모든 온라인 커머스에 동일한 기준을 적용해.
- 다크패턴인지 아닌지 판단이 애매하면, 가장 가까운 라벨을 붙이되 confidence를 0.5 이하로 낮게 줘. reason에 "판단 보류 - 애매함"이라고 명시해.

[NORMAL로 판정하는 경우]
- 법적 필수 약관 동의 체크박스가 미체크 상태로 제공되는 경우
- 확인/취소 버튼의 크기·색상 차이가 일반적인 UI 관행 수준인 경우
- 상품 상세 하단의 일반적인 추천 상품 영역 (결제 흐름 중간이 아닌 경우)
- 단순 통계성 정보가 구매 압박 맥락 없이 제공되는 경우

[경계 사례 규칙]
- 버튼이 둘 다 있는데 시각 차이로 유도 → ③ 잘못된 계층구조
- 해지/거절 버튼이 화면에 아예 없음 → ⑥ 취소·해지 방해
- "안 함" 선택 후 같은 요청 재팝업 → ⑪ 반복 간섭
- 결제 중 관련 없는 새 상품 팝업 → ⑩ 기습적 광고

[출력 형식 - 반드시 JSON 한 줄로만 답해]
{"file": "파일명", "primary_label": 숫자, "primary_category": "카테고리", "secondary_label": 숫자 또는 null, "confidence": 0.0~1.0, "reason": "판단 근거 한 줄"}"""


def encode_image(image_path):
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def get_media_type(filename):
    ext = filename.lower().split(".")[-1]
    media_types = {
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "webp": "image/webp",
        "gif": "image/gif",
    }
    return media_types.get(ext, "image/png")


def label_image(image_path):
    base64_image = encode_image(image_path)
    media_type = get_media_type(image_path)

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": PROMPT.replace("파일명", Path(image_path).name),
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{media_type};base64,{base64_image}",
                            "detail": "high",
                        },
                    },
                ],
            }
        ],
        max_tokens=300,
        temperature=0.2,
    )
    return response.choices[0].message.content


# ===== 실행 =====
if __name__ == "__main__":
    image_folder = Path(__file__).parent / "images"
    output_file = Path(__file__).parent / "output" / "labels_B4E2.jsonl"

    # images 폴더 확인
    image_files = sorted([
        f for f in os.listdir(image_folder)
        if f.lower().endswith((".png", ".jpg", ".jpeg", ".webp"))
    ])

    print(f"총 {len(image_files)}장 발견\n")

    # write 모드 
    with open(output_file, "w", encoding="utf-8") as out:
        for i, fname in enumerate(image_files):
            print(f"[{i+1}/{len(image_files)}] {fname} ... ", end="")
            try:
                result = label_image(str(image_folder / fname))

                # JSON 파싱 시도
                # GPT가 ```json ... ``` 으로 감싸는 경우 처리
                cleaned = result.strip()
                if cleaned.startswith("```"):
                    cleaned = cleaned.split("\n", 1)[1]
                    cleaned = cleaned.rsplit("```", 1)[0].strip()

                parsed = json.loads(cleaned)
                out.write(json.dumps(parsed, ensure_ascii=False) + "\n")
                print(f"✓ label={parsed.get('primary_label')} "
                      f"conf={parsed.get('confidence')}")

            except json.JSONDecodeError:
                error_line = {
                    "file": fname,
                    "error": "JSON 파싱 실패",
                    "raw": result,
                }
                out.write(json.dumps(error_line, ensure_ascii=False) + "\n")
                print("⚠ JSON 파싱 실패")

            except Exception as e:
                error_line = {
                    "file": fname,
                    "error": str(e),
                    "raw": "",
                }
                out.write(json.dumps(error_line, ensure_ascii=False) + "\n")
                print(f"⚠ 오류: {e}")

                time.sleep(5)

    print(f"\n완료! 결과 저장: {output_file}")
