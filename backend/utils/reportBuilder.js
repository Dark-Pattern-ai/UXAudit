/**
 * reportBuilder.js
 *
 * 역할: AI 분류 결과 + OCR 패턴 규칙 결과를 통합하여 최종 UXAudit 리포트를 생성한다.
 *
 * 통합 로직 요약:
 *   1. AI 카테고리로 기본 메타(label, message, suggestions)를 결정한다.
 *   2. OCR 텍스트에 patternRules를 적용하여 텍스트 기반 패턴을 추가로 발견한다.
 *   3. OCR이 AI와 다른 카테고리를 탐지했다면 crossPatterns로 별도 표시한다.
 *   4. OCR 가산점(weight 합산)으로 최종 risk_score를 보정한다.
 *
 * 최종 리포트 구조:
 *   {
 *     category, categoryLabel,
 *     riskScore,       // AI 점수 + OCR 가산점 (상한 100)
 *     riskLevel,       // SAFE | MEDIUM | HIGH | CRITICAL
 *     message,
 *     guidelineRef,
 *     patterns,        // AI 기반 패턴 설명
 *     ocrPatterns,     // OCR 규칙 매칭 결과 (같은 카테고리)
 *     crossPatterns,   // OCR 규칙 매칭 결과 (다른 카테고리 — 복합 다크패턴)
 *     suggestions,
 *     ocr: { text, confidence, success },
 *     confidence,
 *     analyzedAt,
 *   }
 */

const { matchRules, calcWeightByCategory } = require('./patternRules');

// ─────────────────────────────────────────────
// 카테고리 메타 정의
// ─────────────────────────────────────────────
const CATEGORY_META = {
  NORMAL: {
    label: '정상',
    riskLevel: 'SAFE',
    message: '다크패턴이 탐지되지 않았습니다.',
    guidelineRef: null,
    patterns: [],
    suggestions: [],
  },
  MISLEADING: {
    label: '오인 유도형',
    riskLevel: 'MEDIUM',
    message: '사용자가 잘못된 정보로 의사결정을 유도받을 수 있습니다.',
    guidelineRef: '금융위원회 가이드라인 범주 1',
    patterns: [
      '중요 정보 작은 글씨 처리',
      '유리한 조건 강조 / 불리한 조건 숨김',
      '허위·과장 표현 사용',
    ],
    suggestions: [
      '핵심 조건(금리, 수수료 등)을 본문과 동일한 크기로 표시하세요.',
      '불리한 조건은 별도 박스 또는 굵은 글씨로 명시하세요.',
    ],
  },
  OBSTRUCTING: {
    label: '권리 행사 방해형',
    riskLevel: 'HIGH',
    message: '사용자의 해지·탈퇴·취소 권리 행사를 방해합니다.',
    guidelineRef: '금융위원회 가이드라인 범주 2',
    patterns: [
      '해지·취소 버튼 숨김 또는 비활성화',
      '불필요한 추가 인증 단계 삽입',
      'UI 미로(Roach Motel) 패턴',
    ],
    suggestions: [
      '해지·취소 경로는 가입 경로와 동일한 단계 수로 구성하세요.',
      '탈퇴 버튼을 설정 화면 최상단에 배치하세요.',
    ],
  },
  PRESSURING: {
    label: '심리적 압박형',
    riskLevel: 'HIGH',
    message: '인위적인 긴박감으로 사용자의 합리적 판단을 방해합니다.',
    guidelineRef: '금융위원회 가이드라인 범주 3',
    patterns: [
      '가짜 카운트다운 타이머',
      '허위 재고·잔여 수량 표시',
      '반복적 팝업·알림 노출',
    ],
    suggestions: [
      '카운트다운이 실제 마감 기한과 일치하는지 확인하세요.',
      '팝업은 세션당 최대 1회로 제한하세요.',
    ],
  },
  EXPLOITING: {
    label: '취약층 이용형',
    riskLevel: 'CRITICAL',
    message: '노인·금융 취약계층의 인지적 한계를 이용합니다.',
    guidelineRef: '금융위원회 가이드라인 범주 4',
    patterns: [
      '고령자 대상 복잡한 UI 구조',
      '기본값(Pre-check) 활용 추가 동의 수집',
      '감정 자극형 광고 문구',
    ],
    suggestions: [
      '모든 체크박스 기본값은 미선택(unchecked)으로 설정하세요.',
      '고령자 모드 또는 큰 글씨 옵션을 제공하세요.',
    ],
  },
};

const RISK_LEVEL_SCORE = {
  SAFE: 0,
  MEDIUM: 40,
  HIGH: 70,
  CRITICAL: 90,
};

const RISK_ORDER = ['SAFE', 'MEDIUM', 'HIGH', 'CRITICAL'];

// ─────────────────────────────────────────────
// 메인 빌더 함수
// ─────────────────────────────────────────────

/**
 * AI 결과 + OCR 결과를 통합하여 최종 리포트 생성
 *
 * @param {{
 *   aiResult: { category: string, risk_score: number, confidence: number },
 *   ocrResult: { text: string, lines: string[], confidence: number, success: boolean }
 * }} input
 * @returns {ReportObject}
 */
function buildReport({ aiResult, ocrResult }) {
  const { category, risk_score, confidence = 1.0 } = aiResult;
  const meta = CATEGORY_META[category] ?? CATEGORY_META['NORMAL'];

  // Step 1: OCR 텍스트로 패턴 규칙 매칭
  const allMatched = ocrResult.success ? matchRules(ocrResult.text) : [];

  // 같은 카테고리 매칭 vs 다른 카테고리 매칭 분리
  const ocrPatterns = allMatched.filter((r) => r.category === category);
  const crossPatterns = allMatched.filter(
    (r) => r.category !== category && r.category !== 'NORMAL'
  );

  // Step 2: OCR 가산점으로 risk_score 보정
  const weightMap = calcWeightByCategory(allMatched);
  const ocrBonus = weightMap[category] ?? 0;

  const baseScore =
    category === 'NORMAL' ? 0 : Math.max(RISK_LEVEL_SCORE[meta.riskLevel], risk_score);

  // OCR 보너스는 최대 30점까지만 가산
  const adjustedScore = Math.min(
    Math.round((baseScore + Math.min(ocrBonus, 30)) * confidence),
    100
  );

  // Step 3: crossPatterns에 CRITICAL 카테고리가 있으면 riskLevel 한 단계 상향
  const hasCriticalCross = crossPatterns.some(
    (r) => CATEGORY_META[r.category]?.riskLevel === 'CRITICAL'
  );
  const finalRiskLevel = hasCriticalCross ? upgradeRiskLevel(meta.riskLevel) : meta.riskLevel;

  // Step 4: OCR 패턴 evidence를 suggestions에 추가
  const ocrSuggestions = ocrPatterns.map((r) => `[${r.id}] ${r.evidence}`);

  return {
    // 분류 결과
    category,
    categoryLabel: meta.label,

    // 위험도
    riskScore: adjustedScore,
    riskLevel: finalRiskLevel,
    message: meta.message,
    guidelineRef: meta.guidelineRef,

    // 패턴 목록
    patterns: meta.patterns,
    ocrPatterns: ocrPatterns.map((r) => ({
      id: r.id,
      label: r.label,
      matchedText: r.matchedText,
      evidence: r.evidence,
    })),
    crossPatterns: crossPatterns.map((r) => ({
      id: r.id,
      category: r.category,
      label: r.label,
      matchedText: r.matchedText,
    })),

    // 개선 가이드
    suggestions: [...meta.suggestions, ...ocrSuggestions],

    // OCR 원문
    ocr: {
      text: ocrResult.text,
      confidence: ocrResult.confidence,
      success: ocrResult.success,
    },

    // 메타
    confidence: Math.round(confidence * 100),
    analyzedAt: new Date().toISOString(),
  };
}

function upgradeRiskLevel(level) {
  const idx = RISK_ORDER.indexOf(level);
  return RISK_ORDER[Math.min(idx + 1, RISK_ORDER.length - 1)];
}

module.exports = { buildReport };
