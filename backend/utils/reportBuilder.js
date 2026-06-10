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
    patternDescriptions: [
      '가격·수수료·조건 등 소비자에게 중요한 정보를 의도적으로 작은 글씨로 처리하여 인지하기 어렵게 만드는 행위가 탐지됐습니다.',
      '유리한 조건(할인, 혜택)은 크게 강조하면서 불리한 조건(추가 비용, 제한 사항)은 눈에 띄지 않게 배치한 행위가 탐지됐습니다.',
      '"최저", "무조건", "항상" 등 실제와 다르거나 과장된 표현을 사용하여 소비자를 오인하게 만드는 행위가 탐지됐습니다.',
    ],
    suggestions: [
      '[가이드라인 1-1] 중요 정보(가격, 수수료, 만기 등)는 동일한 크기 이상의 글씨로 표시하세요.',
      '[가이드라인 1-2] 불리한 조건은 별도 팝업 또는 굵은 글씨 등으로 강조 표시하세요.',
      '[가이드라인 1-3] 광고 문구에 "최대", "무조건" 등 절대적 표현 사용을 자제하세요.',
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
    patternDescriptions: [
      '취소·해지 버튼을 의도적으로 숨기거나 비활성화하여 소비자가 서비스를 쉽게 중단하지 못하도록 방해하는 행위가 탐지됐습니다.',
      '취소·변경 과정에서 꼭 필요하지 않은 추가 인증 단계를 삽입해 소비자의 권리 행사를 어렵게 만드는 행위가 탐지됐습니다.',
      '가입은 단순하게 설계하고 해지는 여러 단계를 거치도록 만들어 소비자가 쉽게 빠져나오지 못하게 하는 UI 패턴이 탐지됐습니다.',
    ],
    suggestions: [
      '[가이드라인 2-1] 해지·취소 경로는 가입 경로와 동일한 단계 수로 구성하세요.',
      '[가이드라인 2-2] 탈퇴 버튼을 설정 화면에서 쉽게 찾을 수 있는 위치에 배치하세요.',
      '[가이드라인 2-3] 해지 시 불필요한 추가 인증(본인인증 중복 등)을 요구하지 마세요.',
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
    patternDescriptions: [
      '실제 마감 기한이 없음에도 카운트다운 타이머를 표시하여 소비자에게 인위적인 긴박감을 조성하는 행위가 탐지됐습니다.',
      '실제 재고·혜택 현황과 무관하게 "잔여 N개", "한정 특가" 등의 문구로 희소성을 과장하는 행위가 탐지됐습니다.',
      '소비자가 원하지 않는 시점에 팝업·알림을 반복 노출하여 특정 행동을 유도하는 행위가 탐지됐습니다.',
    ],
    suggestions: [
      '[가이드라인 3-1] 카운트다운 타이머는 실제 마감 기한이 있는 경우에만 사용하세요.',
      '[가이드라인 3-2] 팝업의 노출 빈도는 세션당 최대 1회로 제한하세요.',
      '[가이드라인 3-3] "지금 하지 않으면 손해" 등 공포 마케팅 표현을 삭제하세요.',
    ],
  },
  EXPLOITING: {
    label: '편취유도형',
    riskLevel: 'CRITICAL',
    message: '소비자가 인지하기 어려운 방식으로 추가 비용을 유도하거나 불리한 계약을 체결하게 만드는 행위가 탐지됐습니다.',
    guidelineCategory: '금융위 가이드라인 별표 4 – 편취유도형',
    patterns: [
      '순차 공개 가격책정 (Drip Pricing)',
      '동의 없는 자동갱신 UI 구성',
      '기본값(Pre-check) 적용 동의 없는 구독',
    ],
    patternDescriptions: [
      '상품·서비스의 최종 가격을 처음부터 모두 표시하지 않고 배송비·수수료 등을 단계적으로 추가하여 소비자가 실제 지불 금액을 인지하지 못하게 하는 행위가 탐지됐습니다.',
      '소비자의 명시적 동의 없이 자동갱신이 진행되거나, 갱신 사실을 알기 어렵게 UI를 구성한 행위가 탐지됐습니다.',
      '소비자가 별도로 해제하지 않으면 자동으로 구독·동의가 적용되도록 체크박스 기본값을 설정한 행위가 탐지됐습니다.',
    ],
    suggestions: [
      '[가이드라인 4-1] 배송비·수수료 등 모든 추가 비용을 상품 가격과 함께 첫 화면에 명시하세요.',
      '[가이드라인 4-2] 자동갱신 상품은 갱신 7일 전 문자·앱 알림을 의무화하세요.',
      '[가이드라인 4-3] 모든 체크박스 기본값은 미선택(unchecked)으로 설정하세요.',
    ],
  },
};

const ALL_CATEGORIES = ['MISLEADING', 'OBSTRUCTING', 'PRESSURING', 'EXPLOITING'];

const RISK_ORDER = ['SAFE', 'MEDIUM', 'HIGH', 'CRITICAL'];

function buildReport({ aiResult, ocrResult, imageMeta = null }) {
  const {
    category,
    risk_score,
    confidence = 1.0,
    patterns_detected = [],
    overall_severity,
    executive_summary,
  } = aiResult;

  const meta = CATEGORY_META[category] ?? CATEGORY_META['NORMAL'];
  const geminiPatterns = patterns_detected.filter(p => p && p.name);

  const detectedPatterns = geminiPatterns.length > 0
    ? geminiPatterns.map((p, idx) => ({
        id: idx + 1,
        category: mapGeminiTypeToCategory(p.type, category),
        patternName: p.name,
        riskLevel: p.severity || meta.riskLevel,
        description: p.evidence || meta.message,
        recommendation: p.improvement || meta.suggestions[idx] || meta.suggestions[0] || '',
        location: null,
        sourceImageId: imageMeta?.id ?? null,
      }))
    : (category !== 'NORMAL'
        ? meta.patterns.map((name, idx) => ({
            id: idx + 1,
            category,
            patternName: name,
            riskLevel: meta.riskLevel,
            description: (meta.patternDescriptions && meta.patternDescriptions[idx])
              ? meta.patternDescriptions[idx]
              : meta.message,
            recommendation: meta.suggestions[idx] ?? meta.suggestions[0] ?? '',
            location: null,
            sourceImageId: imageMeta?.id ?? null,
          }))
        : []);

  const overallRiskScore = Math.min(Math.round(risk_score * confidence), 100);
  const finalRiskLevel = overall_severity || meta.riskLevel;

  const detectedCategories = new Set(detectedPatterns.map((p) => p.category));
  const guidelineCompliance = ALL_CATEGORIES.map((cat) => ({
    category: cat,
    isCompliant: !detectedCategories.has(cat),
    details: detectedCategories.has(cat)
      ? `${CATEGORY_META[cat]?.label || cat} 패턴 탐지됨`
      : '위반 없음',
  }));

  const summary = executive_summary ||
    (detectedPatterns.length > 0
      ? `해당 화면에서 총 ${detectedPatterns.length}건의 다크패턴이 탐지됐습니다. ${meta.message}`
      : '다크패턴이 탐지되지 않았습니다.');

  return {
    category,
    categoryLabel: meta.label,
    overallRiskScore,
    riskLevel: finalRiskLevel,
    summary,
    totalDetected: detectedPatterns.length,
    detectedPatterns,
    guidelineCompliance,
    suggestions: geminiPatterns.length > 0
      ? geminiPatterns.map(p => p.improvement || '').filter(Boolean)
      : meta.suggestions,
    ocr: {
      text: ocrResult.text,
      confidence: ocrResult.confidence,
      success: ocrResult.success,
    },
    confidence: Math.round(confidence * 100),
    analyzedAt: new Date().toISOString(),
  };
}

function mapGeminiTypeToCategory(type, defaultCategory) {
  const typeMap = {
    'urgency': 'PRESSURING',
    'hidden_cost': 'MISLEADING',
    'confirm_shaming': 'OBSTRUCTING',
    'subscription_trap': 'EXPLOITING',
    'misdirection': 'MISLEADING',
    'roach_motel': 'OBSTRUCTING',
    'emotional_manipulation': 'PRESSURING',
    'pressuring': 'PRESSURING',
    'misleading': 'MISLEADING', 
  };
  return typeMap[type] || defaultCategory;
}

module.exports = { buildReport };
