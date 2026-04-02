/**
 * reportBuilder.js
 *
 * 프론트 스펙(patternTypes.ts)에 맞춰 리포트 구조를 생성한다.
 *
 * 변경 이력:
 *   - riskScore          → overallRiskScore
 *   - ocrPatterns        → detectedPatterns  (프론트 detectedPatterns 구조 준수)
 *   - guidelineRef       → guidelineCompliance (배열 형태)
 *   - categoryLabel      → 프론트 label과 동일하게 통일
 *   - totalDetected      추가 (detectedPatterns.length)
 *   - summary            추가 (message 재활용)
 */

const { matchRules, calcWeightByCategory } = require('./patternRules');

// ─────────────────────────────────────────────
// 카테고리 메타
// 프론트 CATEGORY_CONFIG label과 완전히 동일하게 맞춤
// ─────────────────────────────────────────────
const CATEGORY_META = {
  NORMAL: {
    label: '정상',
    riskLevel: 'SAFE',
    message: '다크패턴이 탐지되지 않았습니다.',
    guidelineCategory: null,
    patterns: [],
    suggestions: [],
  },
  MISLEADING: {
    label: '오도형',                           // 프론트 CATEGORY_CONFIG와 동일
    riskLevel: 'MEDIUM',
    message: '거짓 또는 왜곡된 정보로 소비자를 오도하는 행위가 탐지됐습니다.',
    guidelineCategory: '금융위원회 가이드라인 범주 1 — 오도형',
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
    label: '방해형',                           // 프론트 CATEGORY_CONFIG와 동일
    riskLevel: 'HIGH',
    message: '소비자의 취소·해지 등 권리 행사를 방해하는 행위가 탐지됐습니다.',
    guidelineCategory: '금융위원회 가이드라인 범주 2 — 방해형',
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
    label: '압박형',                           // 프론트 CATEGORY_CONFIG와 동일
    riskLevel: 'HIGH',
    message: '심리적 압박을 통해 소비자의 판단을 흐리는 행위가 탐지됐습니다.',
    guidelineCategory: '금융위원회 가이드라인 범주 3 — 압박형',
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
    label: '편취유도형',                       // 프론트 CATEGORY_CONFIG와 동일
    riskLevel: 'CRITICAL',
    message: '가격 정보를 순차적으로 공개하여 비용을 숨기는 행위가 탐지됐습니다.',
    guidelineCategory: '금융위원회 가이드라인 범주 4 — 편취유도형',
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

// 전체 카테고리 목록 (guidelineCompliance 배열 생성용)
const ALL_CATEGORIES = ['MISLEADING', 'OBSTRUCTING', 'PRESSURING', 'EXPLOITING'];

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
 * @param {{
 *   aiResult: { category: string, risk_score: number, confidence: number },
 *   ocrResult: { text: string, lines: string[], confidence: number, success: boolean },
 *   imageMeta?: { id: string, fileName: string, pageLabel: string }
 * }} input
 */
function buildReport({ aiResult, ocrResult, imageMeta = null }) {
  const { category, risk_score, confidence = 1.0 } = aiResult;
  const meta = CATEGORY_META[category] ?? CATEGORY_META['NORMAL'];

  // ── Step 1: OCR 패턴 매칭 ──────────────────────────
  const allMatched = ocrResult.success ? matchRules(ocrResult.text) : [];

  const sameCategory  = allMatched.filter((r) => r.category === category);
  const crossCategory = allMatched.filter(
    (r) => r.category !== category && r.category !== 'NORMAL'
  );

  // ── Step 2: 점수 보정 ──────────────────────────────
  const weightMap = calcWeightByCategory(allMatched);
  const ocrBonus  = weightMap[category] ?? 0;
  const baseScore = category === 'NORMAL'
    ? 0
    : Math.max(RISK_LEVEL_SCORE[meta.riskLevel], risk_score);

  const overallRiskScore = Math.min(
    Math.round((baseScore + Math.min(ocrBonus, 30)) * confidence),
    100
  );

  // ── Step 3: riskLevel 보정 ─────────────────────────
  const hasCriticalCross = crossCategory.some(
    (r) => CATEGORY_META[r.category]?.riskLevel === 'CRITICAL'
  );
  const finalRiskLevel = hasCriticalCross
    ? upgradeRiskLevel(meta.riskLevel)
    : meta.riskLevel;

  // ── Step 4: detectedPatterns 생성 ─────────────────
  // 프론트 detectedPatterns 구조에 맞게 변환
  const detectedPatterns = [
    // AI 분류 기반 기본 패턴 (category가 NORMAL이 아닐 때)
    ...(category !== 'NORMAL'
      ? meta.patterns.map((name, idx) => ({
          id: idx + 1,
          category,
          patternName: name,
          riskLevel: finalRiskLevel,
          description: meta.message,
          recommendation: meta.suggestions[idx] ?? meta.suggestions[0] ?? '',
          location: null,           // AI팀이 추후 채울 필드
          sourceImageId: imageMeta?.id ?? null,
        }))
      : []),
    // OCR 탐지 패턴 (같은 카테고리)
    ...sameCategory.map((r, idx) => ({
      id: meta.patterns.length + idx + 1,
      category: r.category,
      patternName: r.label,
      riskLevel: finalRiskLevel,
      description: r.evidence,
      recommendation: `[${r.id}] ${r.evidence}`,
      location: null,
      sourceImageId: imageMeta?.id ?? null,
      matchedText: r.matchedText,   // OCR 증거 텍스트 (프론트 추가 표시용)
    })),
    // 복합 패턴 (다른 카테고리)
    ...crossCategory.map((r, idx) => ({
      id: meta.patterns.length + sameCategory.length + idx + 1,
      category: r.category,
      patternName: r.label,
      riskLevel: CATEGORY_META[r.category]?.riskLevel ?? 'MEDIUM',
      description: r.evidence,
      recommendation: `[${r.id}] ${r.evidence}`,
      location: null,
      sourceImageId: imageMeta?.id ?? null,
      matchedText: r.matchedText,
    })),
  ];

  // ── Step 5: guidelineCompliance 배열 생성 ──────────
  // 프론트 guidelineCompliance 구조에 맞게 변환
  const detectedCategories = new Set(detectedPatterns.map((p) => p.category));
  const guidelineCompliance = ALL_CATEGORIES.map((cat) => ({
    category: cat,
    isCompliant: !detectedCategories.has(cat),
    details: detectedCategories.has(cat)
      ? `${CATEGORY_META[cat].label} 패턴 탐지됨`
      : '위반 없음',
  }));

  // ── Step 6: summary 생성 ──────────────────────────
  const summary = detectedPatterns.length > 0
    ? `해당 화면에서 총 ${detectedPatterns.length}건의 다크패턴이 탐지됐습니다. ${meta.message}`
    : '다크패턴이 탐지되지 않았습니다.';

  return {
    // ── 프론트 스펙 필드 ──────────────────────────────
    category,
    categoryLabel: meta.label,           // 프론트 CATEGORY_CONFIG label과 동일
    overallRiskScore,                     // 0~100 (구: riskScore)
    riskLevel: finalRiskLevel,            // SAFE | MEDIUM | HIGH | CRITICAL
    summary,                              // 요약 텍스트 (신규)
    totalDetected: detectedPatterns.length, // 탐지 총 개수 (신규)
    detectedPatterns,                     // 패턴 목록 (구: ocrPatterns)
    guidelineCompliance,                  // 준수 여부 배열 (구: guidelineRef 문자열)

    // ── 추가 정보 ─────────────────────────────────────
    suggestions: [
      ...meta.suggestions,
      ...sameCategory.map((r) => `[${r.id}] ${r.evidence}`),
    ],
    ocr: {
      text: ocrResult.text,
      confidence: ocrResult.confidence,
      success: ocrResult.success,
    },
    confidence: Math.round(confidence * 100),
    analyzedAt: new Date().toISOString(),
  };
}

function upgradeRiskLevel(level) {
  const idx = RISK_ORDER.indexOf(level);
  return RISK_ORDER[Math.min(idx + 1, RISK_ORDER.length - 1)];
}

module.exports = { buildReport };