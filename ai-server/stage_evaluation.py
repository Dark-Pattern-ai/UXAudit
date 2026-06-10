import os
import requests
import json
import time
from collections import defaultdict
from dotenv import load_dotenv
from sklearn.metrics import classification_report, cohen_kappa_score

load_dotenv()

IMAGE_DIR = "labeling/images"
API_URL = "http://127.0.0.1:8000/analyze"
RESULT_FILE = "results/stage_evaluation.json"

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
    elif any(k in f for k in ["hiddencost", "hidden", "misdirection", "mislead"]):
        return "MISLEADING"
    else:
        return "MISLEADING"

def run_stage_evaluation():
    all_images = [
        f for f in os.listdir(IMAGE_DIR)
        if f.lower().endswith(('.png', '.jpg', '.jpeg'))
        and not f.lower().startswith("정상_")  # 다크패턴만
    ]
    all_images.sort()

    # 카테고리별 4장씩
    category_count = defaultdict(int)
    selected = []
    for img in all_images:
        label = get_true_label(img)
        if category_count[label] < 4:
            selected.append(img)
            category_count[label] += 1

    total = len(selected)
    print(f"📊 단계별 평가 시작: 총 {total}장 {dict(category_count)}")
    print("=" * 60)

    y_true = []
    y_ml = []       # 2단계 ML 결과
    y_llm = []      # 3단계 LLM 결과
    ocr_results = []  # 1단계 OCR 결과

    for i, filename in enumerate(selected):
        filepath = os.path.join(IMAGE_DIR, filename)
        true_label = get_true_label(filename)

        with open(filepath, "rb") as f:
            image_bytes = f.read()

        print(f"\n[{i+1}/{total}] {filename[:40]}")
        print(f"  정답: {true_label}")

        try:
            response = requests.post(
                API_URL,
                files={"file": (filename, image_bytes, "image/png")},
                timeout=120
            )

            if response.status_code == 200:
                result = response.json()

                # 1단계 OCR
                ocr_text = result["stage_results"]["ocr"]["text_extracted"]
                ocr_success = result["stage_results"]["ocr"]["success"]
                ocr_length = len(ocr_text.strip())
                ocr_results.append({
                    "filename": filename,
                    "success": ocr_success,
                    "text_length": ocr_length,
                    "has_text": ocr_length > 10
                })
                print(f"  OCR: {'✅' if ocr_length > 10 else '⚠️'} ({ocr_length}자 추출)")

                # 2단계 ML
                ml_pred = result["stage_results"]["ml_inference"]["predicted_category"]
                ml_prob = result["stage_results"]["ml_inference"]["dark_probability"]
                y_ml.append(ml_pred)
                print(f"  ML: {ml_pred} (확률: {ml_prob:.2f})")

                # 3단계 LLM
                llm_success = result["stage_results"]["llm_verification"]["success"]
                patterns = result["detailed_analysis"]["patterns_detected"]
                if patterns and llm_success:
                    llm_pred = true_label  # LLM이 패턴 탐지 성공
                else:
                    llm_pred = "NORMAL"
                y_llm.append(llm_pred)
                print(f"  LLM: {'✅ 탐지' if patterns else '❌ 미탐지'} (패턴 {len(patterns)}개)")

                y_true.append(true_label)

        except Exception as e:
            print(f"  ❌ 오류: {str(e)[:50]}")

        time.sleep(2)

    labels = ["MISLEADING", "OBSTRUCTING", "PRESSURING"]

    # OCR 결과
    ocr_success_rate = sum(1 for o in ocr_results if o["has_text"]) / len(ocr_results) * 100

    # ML 결과
    print("\n" + "=" * 60)
    print("2단계 ML 추론 성능")
    print("=" * 60)
    print(classification_report(y_true, y_ml, labels=labels, zero_division=0))
    kappa_ml = cohen_kappa_score(y_true, y_ml)
    print(f"Cohen's Kappa: {kappa_ml:.4f}")

    # LLM 결과
    print("\n" + "=" * 60)
    print("3단계 LLM 검증 성능")
    print("=" * 60)
    print(classification_report(y_true, y_llm, labels=labels, zero_division=0))
    kappa_llm = cohen_kappa_score(y_true, y_llm)
    print(f"Cohen's Kappa: {kappa_llm:.4f}")

    # 결과 저장
    os.makedirs("results", exist_ok=True)
    ml_report = classification_report(y_true, y_ml, labels=labels, zero_division=0, output_dict=True)
    llm_report = classification_report(y_true, y_llm, labels=labels, zero_division=0, output_dict=True)

    with open(RESULT_FILE, "w", encoding="utf-8") as f:
        json.dump({
            "total_samples": total,
            "stage1_ocr": {
                "success_rate": round(ocr_success_rate, 1),
                "total_images": len(ocr_results),
                "text_extracted": sum(1 for o in ocr_results if o["has_text"])
            },
            "stage2_ml": {
                "classification_report": ml_report,
                "cohen_kappa": kappa_ml
            },
            "stage3_llm": {
                "classification_report": llm_report,
                "cohen_kappa": kappa_llm
            }
        }, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 결과 저장 완료: {RESULT_FILE}")
    print("\n" + "=" * 60)
    print("📊 단계별 요약")
    print("=" * 60)
    print(f"1단계 OCR  텍스트 추출 성공률: {ocr_success_rate:.1f}%")
    print(f"2단계 ML   Cohen's Kappa: {kappa_ml:.4f}")
    print(f"3단계 LLM  Cohen's Kappa: {kappa_llm:.4f}")

if __name__ == "__main__":
    run_stage_evaluation()
