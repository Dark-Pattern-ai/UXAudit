import re
from dataclasses import dataclass, asdict


@dataclass
class RuleMatch:
    category: str
    pattern_name: str
    pattern_id: int
    confidence: float
    evidence: str


# ──────────────────────────────────────
#  MISLEADING (오도형)
# ──────────────────────────────────────

def rule_preselected_checkbox(text: str) -> RuleMatch | None:
    keywords = ["전체 동의", "모두 동의", "전체동의", "일괄 동의", "선택항목 포함"]
    for kw in keywords:
        if kw in text:
            return RuleMatch(
                category="MISLEADING",
                pattern_name="특정 옵션 사전선택",
                pattern_id=4,
                confidence=0.8,
                evidence=f"키워드 감지: '{kw}'",
            )
    return None


def rule_trick_question(text: str) -> RuleMatch | None:
    patterns = [
        r"거부.*않",
        r"수신.*거부.*않",
        r"해제.*원하지\s*않",
        r"취소.*원하지\s*않",
    ]
    for p in patterns:
        match = re.search(p, text)
        if match:
            return RuleMatch(
                category="MISLEADING",
                pattern_name="속임수 질문",
                pattern_id=2,
                confidence=0.75,
                evidence=f"이중부정 패턴 감지: '{match.group()}'",
            )
    return None


def rule_false_advertising(text: str) -> RuleMatch | None:
    patterns = [
        r"(연|월)\s*\d+(\.\d+)?%\s*(확정|보장|guaranteed)",
        r"(최대|up to)\s*\d+(\.\d+)?%",
        r"원금\s*(보장|보전)",
        r"무조건\s*(수익|이익)",
    ]
    for p in patterns:
        match = re.search(p, text, re.IGNORECASE)
        if match:
            return RuleMatch(
                category="MISLEADING",
                pattern_name="허위광고 및 기만적 유인행위",
                pattern_id=5,
                confidence=0.7,
                evidence=f"과장 광고 표현 감지: '{match.group()}'",
            )
    return None


def rule_abbreviated_explanation(text: str) -> RuleMatch | None:
    agree_count = len(re.findall(r"(약관|이용약관|동의서|개인정보)", text))
    checkbox_count = len(re.findall(r"(동의합니다|동의함|확인합니다)", text))
    if agree_count >= 3 and checkbox_count <= 1:
        return RuleMatch(
            category="MISLEADING",
            pattern_name="설명절차의 과도한 축약",
            pattern_id=1,
            confidence=0.7,
            evidence=f"약관 {agree_count}건 언급, 동의 체크 {checkbox_count}건 → 과도 축약 의심",
        )
    return None


# ──────────────────────────────────────
#  OBSTRUCTING (방해형)
# ──────────────────────────────────────

def rule_cancel_obstruction(text: str) -> RuleMatch | None:
    keywords = ["해지", "탈퇴", "취소", "구독 취소", "해약"]
    step_keywords = ["단계", "step", "다음", "계속", "본인 확인", "사유", "설문"]
    found_cancel = any(kw in text for kw in keywords)
    step_count = sum(1 for kw in step_keywords if kw in text)
    if found_cancel and step_count >= 2:
        return RuleMatch(
            category="OBSTRUCTING",
            pattern_name="취소·해지·탈퇴 방해",
            pattern_id=6,
            confidence=0.8,
            evidence=f"해지 관련 키워드 + 다단계 절차 키워드 {step_count}건 감지",
        )
    return None


def rule_click_fatigue(text: str) -> RuleMatch | None:
    patterns = [
        r"(정말|진짜).*취소",
        r"한\s*번\s*더\s*확인",
        r"다시\s*한번",
        r"최종\s*확인",
    ]
    count = sum(1 for p in patterns if re.search(p, text))
    if count >= 2:
        return RuleMatch(
            category="OBSTRUCTING",
            pattern_name="클릭 피로감 유발",
            pattern_id=9,
            confidence=0.7,
            evidence=f"반복 확인 요구 패턴 {count}건 감지",
        )
    return None


def rule_hidden_info(text: str) -> RuleMatch | None:
    patterns = [
        r"자세한\s*(내용|사항)은?\s*(홈페이지|고객센터|약관)",
        r"세부\s*조건\s*(별도|확인)",
        r"자세히\s*보기",
    ]
    for p in patterns:
        match = re.search(p, text)
        if match:
            return RuleMatch(
                category="OBSTRUCTING",
                pattern_name="숨겨진 정보 제공",
                pattern_id=7,
                confidence=0.6,
                evidence=f"정보 은닉 표현 감지: '{match.group()}'",
            )
    return None


# ──────────────────────────────────────
#  PRESSURING (압박형)
# ──────────────────────────────────────

def rule_countdown_timer(text: str) -> RuleMatch | None:
    patterns = [
        r"\d{1,2}\s*:\s*\d{2}\s*:\s*\d{2}",
        r"\d{1,2}시간\s*\d{1,2}분",
        r"남은\s*시간",
        r"마감\s*임박",
        r"오늘\s*(까지|마감|한정)",
        r"(기간|시간)\s*한정",
    ]
    for p in patterns:
        match = re.search(p, text)
        if match:
            return RuleMatch(
                category="PRESSURING",
                pattern_name="감각 조작",
                pattern_id=13,
                confidence=0.85,
                evidence=f"시간 압박 표현 감지: '{match.group()}'",
            )
    return None


def rule_emotional_language(text: str) -> RuleMatch | None:
    keywords = [
        "놓치면 후회",
        "지금 아니면",
        "다시 없는",
        "손해",
        "손실",
        "위험",
        "불이익",
        "혜택이 사라",
        "기회를 놓",
        "서두르",
    ]
    found = [kw for kw in keywords if kw in text]
    if len(found) >= 1:
        return RuleMatch(
            category="PRESSURING",
            pattern_name="감정적 언어 사용",
            pattern_id=12,
            confidence=0.75,
            evidence=f"감정적 표현 감지: {found}",
        )
    return None


def rule_social_proof(text: str) -> RuleMatch | None:
    patterns = [
        r"\d+[\s,]*명.*가입",
        r"\d+[\s,]*명.*조회",
        r"\d+[\s,]*명.*이용",
        r"\d+[\s,]*명.*시청",
        r"(실시간|지금)\s*\d+",
        r"인기\s*(급상승|폭발)",
    ]
    for p in patterns:
        match = re.search(p, text)
        if match:
            return RuleMatch(
                category="PRESSURING",
                pattern_name="다른 소비자의 활동 알림",
                pattern_id=14,
                confidence=0.8,
                evidence=f"사회적 증거 표현 감지: '{match.group()}'",
            )
    return None


def rule_surprise_ad(text: str) -> RuleMatch | None:
    keywords = ["추천 상품", "함께 보면 좋은", "이런 상품은 어때요", "특별 제안", "추가 혜택"]
    found = [kw for kw in keywords if kw in text]
    if found:
        return RuleMatch(
            category="PRESSURING",
            pattern_name="계약과정 중 기습적 광고",
            pattern_id=10,
            confidence=0.65,
            evidence=f"기습 광고 키워드 감지: {found}",
        )
    return None


# ──────────────────────────────────────
#  EXPLOITING (편취유도형)
# ──────────────────────────────────────

def rule_drip_pricing(text: str) -> RuleMatch | None:
    fee_keywords = ["수수료", "부가세", "VAT", "배송비", "관리비", "서비스 이용료", "플랫폼 수수료"]
    free_keywords = ["무료", "0원", "free", "공짜"]
    found_fee = [kw for kw in fee_keywords if kw in text]
    found_free = any(kw in text.lower() for kw in free_keywords)
    if found_free and len(found_fee) >= 1:
        return RuleMatch(
            category="EXPLOITING",
            pattern_name="순차공개 가격책정",
            pattern_id=15,
            confidence=0.8,
            evidence=f"무료 표기 + 추가 비용 항목 감지: {found_fee}",
        )
    if len(found_fee) >= 3:
        return RuleMatch(
            category="EXPLOITING",
            pattern_name="순차공개 가격책정",
            pattern_id=15,
            confidence=0.7,
            evidence=f"다수의 추가 비용 항목 감지: {found_fee}",
        )
    return None


# ──────────────────────────────────────
#  규칙 집합 & 실행
# ──────────────────────────────────────

ALL_RULES = [
    rule_preselected_checkbox,
    rule_trick_question,
    rule_false_advertising,
    rule_abbreviated_explanation,
    rule_cancel_obstruction,
    rule_click_fatigue,
    rule_hidden_info,
    rule_countdown_timer,
    rule_emotional_language,
    rule_social_proof,
    rule_surprise_ad,
    rule_drip_pricing,
]


def run_rules(ocr_text: str) -> list[dict]:
    matches = []
    for rule_fn in ALL_RULES:
        result = rule_fn(ocr_text)
        if result is not None:
            matches.append(asdict(result))
    return matches


def format_rule_results(matches: list[dict]) -> str:
    if not matches:
        return "규칙 기반 필터링 결과: 다크패턴 의심 항목 없음"
    lines = ["[규칙 기반 필터링 결과]"]
    for i, m in enumerate(matches, 1):
        lines.append(
            f"{i}. [{m['category']}] {m['pattern_name']} "
            f"(신뢰도 {m['confidence']}) - {m['evidence']}"
        )
    return "\n".join(lines)
