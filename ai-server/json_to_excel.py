import json
import os
import pandas as pd

rows = []

# 다크패턴 이미지 (정답: True)
dark_dir = "results/dark"
for filename in os.listdir(dark_dir):
    if not filename.endswith(".json"):
        continue
    with open(os.path.join(dark_dir, filename), "r", encoding="utf-8") as f:
        data = json.load(f)
    rows.append({
        "파일명": data["metadata"]["filename"],
        "정답": True,
        "모델판단": data["final_result"]["is_dark_pattern"],
        "맞음?": "✅" if data["final_result"]["is_dark_pattern"] == True else "❌",
        "심각도": data["final_result"]["overall_severity"],
        "신뢰도": data["final_result"]["confidence_score"],
        "Rule탐지": data["stage_results"]["rule_engine"]["detected"],
        "LLM성공": data["stage_results"]["llm_verification"]["success"],
        "탐지유형": ", ".join([p.get("type","") for p in data["detailed_analysis"]["patterns_detected"]]),
        "구분": "dark"
    })

# 정상 이미지 (정답: False)
normal_dir = "results/normal"
for filename in os.listdir(normal_dir):
    if not filename.endswith(".json"):
        continue
    with open(os.path.join(normal_dir, filename), "r", encoding="utf-8") as f:
        data = json.load(f)
    rows.append({
        "파일명": data["metadata"]["filename"],
        "정답": False,
        "모델판단": data["final_result"]["is_dark_pattern"],
        "맞음?": "✅" if data["final_result"]["is_dark_pattern"] == False else "❌",
        "심각도": data["final_result"]["overall_severity"],
        "신뢰도": data["final_result"]["confidence_score"],
        "Rule탐지": data["stage_results"]["rule_engine"]["detected"],
        "LLM성공": data["stage_results"]["llm_verification"]["success"],
        "탐지유형": ", ".join([p.get("type","") for p in data["detailed_analysis"]["patterns_detected"]]),
        "구분": "normal"
    })

df = pd.DataFrame(rows)

# 정확도 계산
correct = len(df[df["맞음?"] == "✅"])
total = len(df)
accuracy = correct / total * 100

print(f"✅ 전체 데이터: {total}개")
print(f"✅ 정답: {correct}개")
print(f"📊 정확도: {accuracy:.1f}%")

df.to_excel("results/batch_result_final.xlsx", index=False)
print("💾 엑셀 저장 완료: results/batch_result_final.xlsx")
