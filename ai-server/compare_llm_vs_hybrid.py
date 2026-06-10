import os
import requests
import json
import time
from collections import defaultdict
from google import genai
from google.genai import types
from dotenv import load_dotenv
from sklearn.metrics import classification_report, cohen_kappa_score

load_dotenv()

# ===== 설정 =====
IMAGE_DIR = "labeling/images"
API_URL = "http://127.0.0.1:8000/analyze"
RESULT_FILE = "results/comparison_report.json"
# ================

def get_true_label(filename: str) -> str:
    f = filename.lower()
    if f.startswith("정상_"):
        return "NORMAL"
    elif any(k in f for k in ["confirmshaming", "confirm"]):
        return "OBSTRUCTING"
    elif any(k in f for k in ["nagging", "scarcity", "socialproof", "urgency"]):
        return "PRESSURING"
    elif any(k in f for k in ["obstruction", "obstruct", "forcedaction", "complex", "roach"]):
        return "OBSTRUCTING"
    elif any(k in f for k in ["preselected", "subscription", "gamif"]):
        return "EXPLOITING"
    elif any(k in f for k in ["hiddencost", "hidden", "misdirection", "mislead"]):
        return "MISLEADING"
    else:
        return "MISLEADING"

def llm_only_predict(image_bytes: bytes, filename: str) -> str:
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    prompt = """
당신은 UX 다크패턴 분류 전문가입니다.
이 이미지를 보고 다크패턴 카테고리를 아래 중 하나로만 답하세요.
반드시 JSON 형식으로만 응답하세요.

카테고리:
- NORMAL: 다크패턴 없음
- MISLEADING: 오도형 (숨겨진 비용, 허위 정보)
- OBSTRUCTING: 방해형 (취소/해지 방해, 강제 행동)
- PRESSURING: 압박형 (가짜 타이머, 희소성, 반복 알림)
- EXPLOITING: 편취유도형 (사전 선택, 자동갱신, 게임화)

응답 형식:
{"category": "NORMAL", "reason": "이유를 한 문장으로"}
"""
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type='image/png'),
                prompt
            ]
        )
        content = response.text.strip()
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
        result = json.loads(content)
        return result.get("category", "NORMAL")
    except Exception as e:
        print(f"  ⚠️ LLM 오류: {str(e)[:100]}")
        return "NORMAL"

def hybrid_predict(image_bytes: bytes, filename: str) -> str:
    try:
        response = requests.post(
            API_URL,
            files={"file": (filename, image_bytes, "image/png")},
            timeout=120
        )
        if response.status_code == 200:
            result = response.json()
            return result["stage_results"]["ml_inference"]["predicted_category"]
        return "NORMAL"
    except Exception as e:
        print(f"  ⚠️ 하이브리드 오류: {str(e)[:100]}")
        return "NORMAL"

def run_comparison():
    # 이미지 수집
    all_images = [
        f for f in os.listdir(IMAGE_DIR)
        if f.lower().endswith(('.png', '.jpg', '.jpeg'))
    ]
    all_images.sort()

    # 카테고리별 4장씩 선별
    category_count = defaultdict(int)
    selected = []
    for img in all_images:
        label = get_true_label(img)
        if label == "EXPLOITING":  # ← 이 줄 추가
           continue
        if category_count[label] < 4:
            selected.append(img)
            category_count[label] += 1

    images = selected
    total = len(images)
    print(f"📊 비교 평가 시작: 총 {total}장 {dict(category_count)}")
    print("=" * 60)

    y_true = []
    y_llm = []
    y_hybrid = []
    timing_llm = []
    timing_hybrid = []

    for i, filename in enumerate(images):
        filepath = os.path.join(IMAGE_DIR, filename)
        true_label = get_true_label(filename)

        with open(filepath, "rb") as f:
            image_bytes = f.read()

        print(f"\n[{i+1}/{total}] {filename[:40]}")
        print(f"  정답: {true_label}")

        # LLM 단독
        t0 = time.time()
        llm_pred = llm_only_predict(image_bytes, filename)
        llm_time = round(time.time() - t0, 2)
        timing_llm.append(llm_time)
        print(f"  LLM 단독: {llm_pred} ({llm_time}s)")

        time.sleep(3)

        # 하이브리드
        t0 = time.time()
        hybrid_pred = hybrid_predict(image_bytes, filename)
        hybrid_time = round(time.time() - t0, 2)
        timing_hybrid.append(hybrid_time)
        print(f"  하이브리드: {hybrid_pred} ({hybrid_time}s)")

        y_true.append(true_label)
        y_llm.append(llm_pred)
        y_hybrid.append(hybrid_pred)

        time.sleep(3)

    # ===== 결과 출력 =====
    labels = ["NORMAL", "MISLEADING", "OBSTRUCTING", "PRESSURING"]

    print("\n" + "=" * 60)
    print("🤖 LLM 단독 성능")
    print("=" * 60)
    print(classification_report(y_true, y_llm, labels=labels, zero_division=0))
    kappa_llm = cohen_kappa_score(y_true, y_llm)
    avg_llm_time = round(sum(timing_llm) / len(timing_llm), 2)
    print(f"Cohen's Kappa: {kappa_llm:.4f}")
    print(f"평균 처리 시간: {avg_llm_time}s/장")

    print("\n" + "=" * 60)
    print("⚙️ 하이브리드 파이프라인 성능")
    print("=" * 60)
    print(classification_report(y_true, y_hybrid, labels=labels, zero_division=0))
    kappa_hybrid = cohen_kappa_score(y_true, y_hybrid)
    avg_hybrid_time = round(sum(timing_hybrid) / len(timing_hybrid), 2)
    print(f"Cohen's Kappa: {kappa_hybrid:.4f}")
    print(f"평균 처리 시간: {avg_hybrid_time}s/장")

    # ===== JSON 저장 =====
    os.makedirs("results", exist_ok=True)
    llm_report = classification_report(y_true, y_llm, labels=labels, zero_division=0, output_dict=True)
    hybrid_report = classification_report(y_true, y_hybrid, labels=labels, zero_division=0, output_dict=True)

    with open(RESULT_FILE, "w", encoding="utf-8") as f:
        json.dump({
            "total_samples": total,
            "llm_only": {
                "classification_report": llm_report,
                "cohen_kappa": kappa_llm,
                "avg_time_per_image": avg_llm_time
            },
            "hybrid": {
                "classification_report": hybrid_report,
                "cohen_kappa": kappa_hybrid,
                "avg_time_per_image": avg_hybrid_time
            }
        }, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 결과 저장 완료: {RESULT_FILE}")

if __name__ == "__main__":
    run_comparison()
