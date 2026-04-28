import re
from typing import Dict, List

# 다크패턴 규칙 정의
DARK_PATTERN_RULES = {
    "urgency_pressure": {
        "name": "긴박감 조성",
        "keywords": [
            "한정", "마감", "오늘만", "지금 바로", "곧 종료", "마지막 기회",
            "limited", "expires", "hurry", "last chance", "ending soon",
            "시간 한정", "수량 한정", "특가 종료",
            "깜짝", "찬스", "득템", "품절", "놓치지", "잊지말고", "할인 찬스"
        ],
        "patterns": [
            r"\d+\s*(분|초|시간|일)\s*(후|뒤|남음|만)",
            r"(오늘|today)\s*(까지|only|만)",
            r"\d+개?\s*남음",
            r"카운트다운",
            r"깜짝.{0,10}(할인|찬스|이벤트)",
            r"품절.{0,10}(전|임박)",
        ],
        "severity": "HIGH"
    },
    
    "hidden_costs": {
        "name": "숨겨진 비용",
        "keywords": [
            "배송비 별도", "부가세 별도", "수수료", "추가 요금", "추가 비용",
            "shipping not included", "tax not included", "additional fee",
            "별도 청구", "따로 결제"
        ],
        "patterns": [
            r"(무료|free).{0,20}(배송|shipping).{0,30}(별도|제외|not)",
            r"\+\s*\d+[,\d]*\s*(원|₩|\$)",
            r"(세금|tax|부가세).{0,10}(별도|포함 안|excluded)",
        ],
        "severity": "MEDIUM"
    },
    
    "confirm_shaming": {
        "name": "수치심 유발 거절",
        "keywords": [
            "아니요, 저는 손해를", "괜찮아요, 혜택 필요 없어요",
            "no thanks, i don't want", "no, i don't want to save",
            "i prefer to pay more", "혜택 포기", "할인 거부"
        ],
        "patterns": [
            r"아니(요|오).{0,30}(손해|포기|필요\s*없|싫)",
            r"no.{0,30}(don't\s*want|prefer\s*not|miss\s*out)",
        ],
        "severity": "HIGH"
    },
    
    "subscription_trap": {
        "name": "구독 함정",
        "keywords": [
            "자동 결제", "자동 연장", "무료 체험 후", "구독 자동 갱신",
            "auto-renewal", "automatically charged", "trial then billed",
            "해지하지 않으면", "자동으로 결제"
        ],
        "patterns": [
            r"무료.{0,20}(후|뒤|지나면).{0,20}(결제|청구|자동)",
            r"free.{0,30}(then|after).{0,30}(charged|billed)",
            r"자동.{0,10}(결제|연장|갱신)",
        ],
        "severity": "HIGH"
    },  # ✅ 여기 쉼표 추가
    
    "roach_motel": {
        "name": "해지 방해",
        "keywords": [
            "해지하기", "해지 방법", "해지 신청", "유지하기",
            "정말 해지", "해지 전 확인", "해지하면 손해",
            "멤버십 해지", "구독 해지", "탈퇴하기",
            "혜택이 사라집니다", "해지 시 소멸",
            "잔여 이용권", "이용권 소멸", "포인트 소멸"
        ],
        "patterns": [
            r"해지.{0,20}(손해|소멸|사라|잃|포기)",
            r"(탈퇴|해지).{0,30}(유지|계속|혜택)",
            r"잔여.{0,10}(이용권|포인트|혜택).{0,20}(소멸|사라|없어)",
        ],
        "severity": "HIGH"
    }
}

def run_rule_engine(ocr_result: Dict) -> Dict:
    """
    OCR 결과를 바탕으로 규칙 기반 다크패턴 탐지
    """
    full_text = ocr_result.get("text_extracted", "")
    if not full_text:
        full_text = ocr_result.get("full_text", "")
    full_text = full_text.lower()

    detections = []
    
    for pattern_id, rule in DARK_PATTERN_RULES.items():
        matched_keywords = []
        matched_patterns = []
        
        # 키워드 매칭
        for keyword in rule["keywords"]:
            if keyword.lower() in full_text:
                matched_keywords.append(keyword)
        
        # 정규표현식 매칭  
        for pattern in rule["patterns"]:
            matches = re.findall(pattern, full_text, re.IGNORECASE)
            if matches:
                matched_patterns.extend([str(m) for m in matches])
        
        # 매칭된 것이 있으면 탐지 결과에 추가
        if matched_keywords or matched_patterns:
            detections.append({
                "pattern_id": pattern_id,
                "pattern_name": rule["name"],
                "severity": rule["severity"],
                "matched_keywords": matched_keywords,
                "matched_patterns": matched_patterns,
                "confidence_score": 0.8 if matched_patterns else 0.6
            })
    
    # 전체 점수 계산
    total_score = sum(d["confidence_score"] for d in detections)
    
    return {
        "has_dark_pattern": len(detections) > 0,
        "total_score": round(total_score, 2),
        "detection_count": len(detections),
        "detections": detections
    }
