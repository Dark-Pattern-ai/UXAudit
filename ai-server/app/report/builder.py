import uuid
from datetime import datetime, timezone


CATEGORY_LIST = ["MISLEADING", "OBSTRUCTING", "PRESSURING", "EXPLOITING"]


def build_report(
    service_name: str,
    image_filename: str,
    image_url: str,
    rule_matches: list[dict],
    llm_result: dict,
) -> dict:
    report_id = f"rpt-{uuid.uuid4().hex[:8]}"
    image_id = f"img-{uuid.uuid4().hex[:6]}"
    now = datetime.now(timezone.utc).isoformat()

    # 탐지된 패턴 조합
    detected_patterns = []
    for i, p in enumerate(llm_result.get("patterns", []), start=1):
        is_rule = p.get("is_rule_detected", False)
        detected_patterns.append(
            {
                "id": i,
                "category": p.get("category", "UNKNOWN"),
                "patternName": p.get("pattern_name", ""),
                "patternId": p.get("pattern_id", 0),
                "riskLevel": p.get("risk_level", "MEDIUM"),
                "description": p.get("description", ""),
                "recommendation": p.get("recommendation", ""),
                "evidence": p.get("evidence", ""),
                "confidence": p.get("confidence", 0.0),
                "isRuleDetected": is_rule,
                "sourceImageId": image_id,
            }
        )

    # 가이드라인 준수 여부
    detected_categories = set(p["category"] for p in detected_patterns)
    guideline_compliance = []
    for cat in CATEGORY_LIST:
        is_compliant = cat not in detected_categories
        details = ""
        if not is_compliant:
            violations = [p for p in detected_patterns if p["category"] == cat]
            names = [v["patternName"] for v in violations]
            details = f"{', '.join(names)} 위반 발견"
        guideline_compliance.append(
            {
                "category": cat,
                "isCompliant": is_compliant,
                "details": details,
            }
        )

    return {
        "id": report_id,
        "serviceName": service_name,
        "analyzedAt": now,
        "overallRiskScore": llm_result.get("overall_risk_score", 0),
        "totalDetected": len(detected_patterns),
        "summary": llm_result.get("summary", ""),
        "uploadedImages": [
            {
                "id": image_id,
                "fileName": image_filename,
                "url": image_url,
                "pageLabel": "분석 대상 화면",
            }
        ],
        "detectedPatterns": detected_patterns,
        "guidelineCompliance": guideline_compliance,
        "analysisMethod": {
            "stage1_rules": len(rule_matches),
            "stage3_llm_patterns": len(llm_result.get("patterns", [])),
        },
    }
