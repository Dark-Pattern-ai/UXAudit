const { matchRules, calcWeightByCategory } = require('./patternRules');

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
    label: '오도형',
    riskLevel: 'MEDIUM',
    message: '거짓 또는 오해를 유발하는 정보로 소비자를 오도하는 행위가 탐지됐습니다.',
    guidelineCategory: '금융위 가이드라인 별표 1 – 오도형',
    patterns: [
      '중요 정보 작은 글씨 처리',
      '유리한 조건 강조 / 불리한 조건 숨김',
      '허위·과장 표현 사용',
    ],
    suggestions: [
      '[금융위 가이드라인 1-1] 중요 정보(금리, 수수료, 만기 등)는 동일한 크기 이상의 글씨로 표시하세요.',
      '[금융위 가이드라인 1-2] 불리한 조건은 별도 팝업 또는 굵은 글씨 등으로 강조 표시하세요.',
      '[금융위 가이드라인 1-3] 광고 문구에 "최대", "무조건" 등 절대적 표현 사용을 자제하세요.',
    ],
  },
  OBSTRUCTING: {
    label: '방해형',
    riskLevel: 'HIGH',
    message: '소비자의 취소·해지 등 권리 행사를 방해하는 행위가 탐지됐습니다.',
    guidelineCategory: '금융위 가이드라인 별표 2 – 방해형',
    patterns: [
      '해지·취소 버튼 숨김 또는 비활성화',
      '불필요한 추가 인증 단계 삽입',
      'UI 미로(Roach Motel) 패턴',
    ],
    suggestions: [
      '[금융위 가이드라인 2-1] 해지·취소 경로는 가입 경로와 동일한 단계 수로 구성하세요.',
      '[금융위 가이드라인 2-2] 탈퇴 버튼을 설정 화면 최상단에 배치하세요.',
      '[금융위 가이드라인 2-3] 해지 시 불필요한 추가 인증(본인인증 중복 등)을 요구하지 마세요.',
    ],
  },
  PRESSURING: {
    label: '압박형',
    riskLevel: 'HIGH',
    message: '심리적 압박을 가해 소비자의 자유로운 의사결정을 방해하는 행위가 탐지됐습니다.',
    guidelineCategory: '금융위 가이드라인 별표 3 – 압박형',
    patterns: [
      '가짜 카운트다운 타이머',
      '잔여 수량·한정 혜택 표시',
      '반복적인 알림·팝업 호출',
    ],
    suggestions: [
      '[금융위 가이드라인 3-1] 카운트다운 타이머는 실제 마감 기한이 있는 경우에만 사용하세요.',
      '[금융위 가이드라인 3-2] 팝업의 노출 빈도는 세션당 최대 1회로 제한하세요.',
      '[금융위 가이드라인 3-3] "지금 가입하지 않으면 손해" 등 공포 마케팅 표현을 삭제하세요.',
    ],
  },
  EXPLOITING: {
    label: '편취유도형',
    riskLevel: 'CRITICAL',
    message: '개인 정보를 악용하거나 취약층을 착취하는 행위가 탐지됐습니다.',
    guidelineCategory: '금융위 가이드라인 별표 4 – 편취유도형',
    patterns: [
      '동의 없는 자동갱신 UI 구성',
      '기본값(Pre-check) 적용 동의 없는 구독',
      '고령자 대상 복잡한 해지 절차',
    ],
    suggestions: [
      '[금융위 가이드라인 4-1] 모든 체크박스 기본값은 미선택(unchecked)으로 설정하세요.',
      '[금융위 가이드라인 4-2] 자동갱신 상품은 갱신 7일 전 문자·앱 알림을 의무화하세요.',
      '[금융위 가이드라인 4-3] 고령자(65세 이상) 대상 화면은 글씨 크기 16px 이상, 단순 2단계 이내 해지 경로를 제공하세요.',
    ],
  },
};

const ALL_CATEGORIES = ['MISLEADING', 'OBSTRUCTING', 'PRESSURING', 'EXPLOITING'];

const RISK_LEVEL_SCORE = {
  SAFE: 0,
  MEDIUM: 40,
  HIGH: 70,
  CRITICAL: 90,
};

const RISK_ORDER = ['SAFE', 'MEDIUM', 'HIGH', 'CRITICAL'];

function buildReport({ aiResult, ocrResult, imageMeta = null }) {
  const { category, risk_score, confidence = 1.0 } = aiResult;
  const meta = CATEGORY_META[category] ?? CATEGORY_META['NORMAL'];

  const allMatched = ocrResult.success ? matchRules(ocrResult.text) : [];

  const sameCategory = allMatched.filter((r) => r.category === category);
  const crossCategory = allMatched.filter(
    (r) => r.category !== category && r.category !== 'NORMAL'
  );

  const weightMap = calcWeightByCategory(allMatched);
  const ocrBonus = weightMap[category] ?? 0;
  const baseScore = category === 'NORMAL'
    ? 0
    : Math.max(RISK_LEVEL_SCORE[meta.riskLevel], risk_score);

  const overallRiskScore = Math.min(
    Math.round((baseScore + Math.min(ocrBonus, 30)) * confidence),
    100
  );

  const hasCriticalCross = crossCategory.some(
    (r) => CATEGORY_META[r.category]?.riskLevel === 'CRITICAL'
  );
  const finalRiskLevel = hasCriticalCross
    ? upgradeRiskLevel(meta.riskLevel)
    : meta.riskLevel;

  const detectedPatterns = [
    ...(category !== 'NORMAL'
      ? meta.patterns.map((name, idx) => ({
          id: idx + 1,
          category,
          patternName: name,
          riskLevel: finalRiskLevel,
          description: meta.message,
          recommendation: meta.suggestions[idx] ?? meta.suggestions[0] ?? '',
          location: null,
          sourceImageId: imageMeta?.id ?? null,
        }))
      : []),
    ...sameCategory.map((r, idx) => ({
      id: meta.patterns.length + idx + 1,
      category: r.category,
      patternName: r.label,
      riskLevel: finalRiskLevel,
      description: r.evidence,
      recommendation: meta.suggestions[idx] ?? meta.suggestions[0] ?? '',
      location: null,
      sourceImageId: imageMeta?.id ?? null,
      matchedText: r.matchedText,
    })),
    ...crossCategory.map((r, idx) => ({
      id: meta.patterns.length + sameCategory.length + idx + 1,
      category: r.category,
      patternName: r.label,
      riskLevel: CATEGORY_META[r.category]?.riskLevel ?? 'MEDIUM',
      description: r.evidence,
      recommendation: CATEGORY_META[r.category]?.suggestions[0] ?? '',
      location: null,
      sourceImageId: imageMeta?.id ?? null,
      matchedText: r.matchedText,
    })),
  ];

  const detectedCategories = new Set(detectedPatterns.map((p) => p.category));
  const guidelineCompliance = ALL_CATEGORIES.map((cat) => ({
    category: cat,
    isCompliant: !detectedCategories.has(cat),
    details: detectedCategories.has(cat)
      ? `${CATEGORY_META[cat].label} 패턴 탐지됨`
      : '위반 없음',
  }));

  const summary = detectedPatterns.length > 0
    ? `해당 화면에서 총 ${detectedPatterns.length}건의 다크패턴이 탐지됐습니다. ${meta.message}`
    : '다크패턴이 탐지되지 않았습니다.';

  return {
    category,
    categoryLabel: meta.label,
    overallRiskScore,
    riskLevel: finalRiskLevel,
    summary,
    totalDetected: detectedPatterns.length,
    detectedPatterns,
    guidelineCompliance,
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
