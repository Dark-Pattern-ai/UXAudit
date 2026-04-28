import requests
import os
import json
import time
from datetime import datetime

# ===== 설정 =====
IMAGE_DIR = "test_images/normal"   # 이미지 폴더 경로
API_URL = "http://127.0.0.1:8000/analyze"
SUMMARY_FILE = "results/batch_summary.json"  # 전체 요약 저장
# ================

def run_batch_test():
    # 이미지 폴더 확인
    if not os.path.exists(IMAGE_DIR):
        print(f"❌ '{IMAGE_DIR}' 폴더가 없어요! 폴더 만들고 이미지 넣어주세요.")
        return

    # 이미지 파일 목록
    images = [
        f for f in os.listdir(IMAGE_DIR)
        if f.lower().endswith(('.png', '.jpg', '.jpeg'))
    ]

    if not images:
        print(f"❌ '{IMAGE_DIR}' 폴더에 이미지가 없어요!")
        return

    images.sort()
    total = len(images)
    print(f"🚀 배치 분석 시작 — 총 {total}개 이미지")
    print(f"⏰ 시작 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 50)

    # 결과 요약 저장용
    summary = []
    success_count = 0
    fail_count = 0

    for i, filename in enumerate(images):
        filepath = os.path.join(IMAGE_DIR, filename)
        print(f"\n[{i+1}/{total}] {filename} 분석 중...")

        try:
            with open(filepath, "rb") as f:
                mime = "image/jpeg" if filename.lower().endswith(".jpg") or filename.lower().endswith(".jpeg") else "image/png"
                response = requests.post(
                    API_URL,
                    files={"file": (filename, f, mime)},
                    timeout=120  # 재시도 포함 최대 2분 대기
                )

            if response.status_code == 200:
                result = response.json()
                is_dark = result["final_result"]["is_dark_pattern"]
                severity = result["final_result"]["overall_severity"]
                confidence = result["final_result"]["confidence_score"]
                llm_success = result["stage_results"]["llm_verification"]["success"]
                rule_detected = result["stage_results"]["rule_engine"]["detected"]

                # 탐지된 패턴 유형 추출
                patterns = [
                    p.get("type", "") 
                    for p in result["detailed_analysis"]["patterns_detected"]
                ]

                print(f"  ✅ 완료")
                print(f"  → 다크패턴: {is_dark} | 심각도: {severity} | 신뢰도: {confidence}")
                print(f"  → Rule탐지: {rule_detected} | LLM성공: {llm_success}")
                print(f"  → 탐지유형: {patterns if patterns else '없음'}")

                summary.append({
                    "filename": filename,
                    "is_dark_pattern": is_dark,
                    "overall_severity": severity,
                    "confidence_score": confidence,
                    "rule_detected": rule_detected,
                    "llm_success": llm_success,
                    "patterns_detected": patterns,
                    "status": "success"
                })
                success_count += 1

            else:
                print(f"  ❌ HTTP 오류: {response.status_code}")
                summary.append({
                    "filename": filename,
                    "status": "http_error",
                    "error": str(response.status_code)
                })
                fail_count += 1

        except requests.exceptions.Timeout:
            print(f"  ⏰ 타임아웃 — 너무 오래 걸림, 다음으로 넘어감")
            summary.append({
                "filename": filename,
                "status": "timeout"
            })
            fail_count += 1

        except Exception as e:
            print(f"  ❌ 오류: {str(e)}")
            summary.append({
                "filename": filename,
                "status": "error",
                "error": str(e)
            })
            fail_count += 1

        # API 과부하 방지 딜레이
        if i < total - 1:
            print(f"  ⏳ 3초 대기 중...")
            time.sleep(3)

    # ===== 전체 요약 =====
    print("\n" + "=" * 50)
    print(f"🎉 배치 분석 완료!")
    print(f"  ✅ 성공: {success_count}개")
    print(f"  ❌ 실패: {fail_count}개")

    # 성공한 것만 통계
    success_results = [s for s in summary if s["status"] == "success"]
    if success_results:
        dark_count = sum(1 for s in success_results if s["is_dark_pattern"])
        print(f"\n  🔍 다크패턴 탐지: {dark_count}/{success_count}개")
        print(f"  📊 탐지율: {dark_count/success_count*100:.1f}%")

        # 패턴 유형별 통계
        all_patterns = []
        for s in success_results:
            all_patterns.extend(s["patterns_detected"])

        if all_patterns:
            from collections import Counter
            pattern_counts = Counter(all_patterns)
            print(f"\n  📋 패턴 유형별 빈도:")
            for pattern, count in pattern_counts.most_common():
                print(f"     - {pattern}: {count}개")

    # 요약 JSON 저장
    os.makedirs("results", exist_ok=True)
    with open(SUMMARY_FILE, "w", encoding="utf-8") as f:
        json.dump({
            "batch_run_at": datetime.now().isoformat(),
            "total": total,
            "success": success_count,
            "fail": fail_count,
            "results": summary
        }, f, ensure_ascii=False, indent=2)

    print(f"\n  💾 요약 저장 완료: {SUMMARY_FILE}")
    print(f"  💾 개별 결과: results/ 폴더 확인")
    print("=" * 50)

if __name__ == "__main__":
    run_batch_test()
