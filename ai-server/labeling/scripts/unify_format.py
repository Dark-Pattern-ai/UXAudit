# labeling/scripts/unify_format.py
"""두 JSONL 파일의 포맷을 통일하는 스크립트"""
import json
from pathlib import Path

LABEL_MAP = {
    0: "NORMAL",
    1: "MISLEADING", 2: "MISLEADING", 3: "MISLEADING",
    4: "MISLEADING", 5: "MISLEADING",
    6: "OBSTRUCTING", 7: "OBSTRUCTING", 8: "OBSTRUCTING",
    9: "OBSTRUCTING",
    10: "PRESSURING", 11: "PRESSURING", 12: "PRESSURING",
    13: "PRESSURING", 14: "PRESSURING",
    15: "EXPLOITING",
}

LABEL_NAME = {
    0: "정상",
    1: "설명절차의 과도한 축약", 2: "속임수 질문",
    3: "잘못된 계층구조", 4: "특정 옵션 사전선택",
    5: "허위광고 및 기만적 유인행위",
    6: "취소·해지·탈퇴 방해", 7: "숨겨진 정보",
    8: "가격비교 방해", 9: "클릭 피로감 유발",
    10: "계약과정 중 기습적 광고", 11: "반복 간섭",
    12: "감정적 언어 사용", 13: "감각 조작",
    14: "다른 소비자의 활동 알림",
    15: "순차공개 가격책정",
}


def unify_jsonl(input_path, output_path, source_tag="unknown"):
    """JSONL 포맷 통일 + 검증"""
    results = []
    errors = 0

    with open(input_path, 'r', encoding='utf-8') as f:
        for i, line in enumerate(f):
            item = json.loads(line.strip())

            # error 행 건너뛰기
            if 'error' in item:
                errors += 1
                continue

            # 필수 필드 검증
            unified = {
                "file": item["file"],
                "primary_label": int(item["primary_label"]),
                "primary_category": item.get("primary_category",
                                              LABEL_MAP.get(int(item["primary_label"]), "UNKNOWN")),
                "secondary_label": item.get("secondary_label"),
                "confidence": float(item.get("confidence", 0.5)),
                "reason": item.get("reason", ""),
                "source": source_tag,  # 데이터 출처 태그
            }
            results.append(unified)

    with open(output_path, 'w', encoding='utf-8') as f:
        for item in results:
            f.write(json.dumps(item, ensure_ascii=False) + '\n')

    print(f"통일 완료: {len(results)}건 저장, {errors}건 에러 제외 → {output_path}")
    return results


if __name__ == "__main__":
    base = Path(__file__).parent.parent / "output"

    # B4E2 학습용
    unify_jsonl(base / "labels_B4E2.jsonl",
                base / "labels_B4E2_unified.jsonl",
                source_tag="b4e2")

    # 160장 테스트용
    unify_jsonl(base / "labels_test.jsonl",
                base / "labels_test_unified.jsonl",
                source_tag="manual_160")
