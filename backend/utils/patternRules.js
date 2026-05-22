/**
 * patternRules.js
 *
 * 역할: OCR로 추출한 텍스트에서 금융 다크패턴 키워드·정규식을 탐지한다.
 *
 * 설계 기준: 금융위원회 가이드라인 4개 범주 15개 유형
 *
 * 각 규칙(Rule) 구조:
 *   {
 *     id:         string,   // 규칙 고유 ID  (예: 'M-01')
 *     category:   string,   // AI 카테고리명 (MISLEADING | OBSTRUCTING | PRESSURING | EXPLOITING)
 *     label:      string,   // 사람이 읽는 패턴명
 *     pattern:    RegExp,   // 텍스트 매칭 정규식
 *     weight:     number,   // 위험도 가산점 (0–30)
 *     evidence:   string,   // 리포트에 표시할 설명
 *   }
 *
 * matchRules(text) 반환값:
 *   MatchedRule[] — 매칭된 규칙 목록 (중복 없음)
 */

// ─────────────────────────────────────────────
// 규칙 정의
// ─────────────────────────────────────────────
const RULES = [

  // ── 범주 1: 오인 유도형 (MISLEADING) ──────────────────

  {
    id: 'M-01',
    category: 'MISLEADING',
    label: '연이율·수수료 소글씨 표기 의심',
    pattern: /연\s*[\d,.]+\s*%|수수료\s*[\d,.]+\s*%|금리\s*[\d,.]+\s*%/,
    weight: 15,
    evidence: '금리·수수료 수치가 텍스트에서 감지됐습니다. 표시 크기와 위치를 확인하세요.',
  },
  {
    id: 'M-02',
    category: 'MISLEADING',
    label: '과장 수익 표현',
    pattern: /최고\s*수익|최대\s*[\d,]+\s*%|무조건\s*(수익|이익)|원금\s*보장/,
    weight: 25,
    evidence: '"최고 수익", "원금 보장" 등 금융소비자보호법상 과장 표현이 감지됐습니다.',
  },
  {
    id: 'M-03',
    category: 'MISLEADING',
    label: '혜택 강조 / 조건 숨김 패턴',
    pattern: /조건\s*없이|무료\s*(제공|혜택)|추가\s*비용\s*없음|평생\s*무료/,
    weight: 20,
    evidence: '"조건 없이", "무료 제공" 등 혜택 강조 표현이 발견됐습니다. 숨겨진 조건이 없는지 확인하세요.',
  },
  {
    id: 'M-04',
    category: 'MISLEADING',
    label: '중요 고지사항 위치 의심',
    pattern: /\*\s*.{1,40}|※\s*.{1,40}|주\s*\d+\)/,
    weight: 10,
    evidence: '각주(*, ※) 형식이 감지됐습니다. 중요 조건이 각주로 처리됐는지 확인하세요.',
  },
  {
    id: 'M-05',
    category: 'MISLEADING',
    label: '비교 기준 불명확',
    pattern: /업계\s*최저|시중\s*대비|최저\s*금리|타사\s*대비/,
    weight: 15,
    evidence: '"업계 최저", "타사 대비" 등 비교 기준이 불명확한 표현이 감지됐습니다.',
  },

  // ── 범주 2: 권리 행사 방해형 (OBSTRUCTING) ────────────

  {
    id: 'O-01',
    category: 'OBSTRUCTING',
    label: '해지·탈퇴 경로 복잡화',
    pattern: /해지\s*(신청|방법|절차)|탈퇴\s*(하려면|방법|신청)|고객센터\s*(문의|통화)\s*(후|해야|필요)/,
    weight: 25,
    evidence: '해지·탈퇴 과정에서 고객센터 경유나 추가 절차가 요구되는 텍스트가 감지됐습니다.',
  },
  {
    id: 'O-02',
    category: 'OBSTRUCTING',
    label: '취소 불가 강조',
    pattern: /취소\s*(불가|불가능|안\s*됩니다)|환불\s*(불가|없음|미지급)|결제\s*완료\s*후\s*취소\s*불가/,
    weight: 20,
    evidence: '"취소 불가" 등 권리 행사를 제한하는 텍스트가 감지됐습니다.',
  },
  {
    id: 'O-03',
    category: 'OBSTRUCTING',
    label: '추가 인증 요구',
    pattern: /추가\s*(본인인증|인증|확인)\s*(필요|요망|해주세요)|공인인증서\s*필요|영업점\s*(방문|내방)/,
    weight: 15,
    evidence: '해지·변경 시 불필요한 추가 인증을 요구하는 텍스트가 감지됐습니다.',
  },

  // ── 범주 3: 심리적 압박형 (PRESSURING) ───────────────

  {
    id: 'P-01',
    category: 'PRESSURING',
    label: '긴박감 유도 문구',
    pattern: /오늘만|지금\s*바로|마감\s*(임박|D-\d)|한정\s*(수량|기간|특가)|선착순\s*\d+/,
    weight: 20,
    evidence: '"오늘만", "마감 임박", "선착순" 등 인위적 긴박감을 유발하는 표현이 감지됐습니다.',
  },
  {
    id: 'P-02',
    category: 'PRESSURING',
    label: '카운트다운·시간 제한',
    pattern: /\d{1,2}\s*:\s*\d{2}\s*:\s*\d{2}|남은\s*시간|시간\s*내\s*신청|기한\s*만료/,
    weight: 25,
    evidence: '카운트다운 타이머 또는 시간 제한 텍스트가 감지됐습니다. 실제 마감과 일치하는지 확인하세요.',
  },
  {
    id: 'P-03',
    category: 'PRESSURING',
    label: '희소성 조작',
    pattern: /잔여\s*\d+\s*(개|건|자리|명)|거의\s*매진|품절\s*임박|\d+명이\s*(보고|신청)/,
    weight: 20,
    evidence: '잔여 수량·인원 표시로 희소성을 과장하는 텍스트가 감지됐습니다.',
  },
  {
    id: 'P-04',
    category: 'PRESSURING',
    label: '손실 회피 자극',
    pattern: /놓치면\s*손해|지금\s*안\s*하면|기회를\s*잃|혜택이\s*사라/,
    weight: 15,
    evidence: '"놓치면 손해" 등 손실 회피 심리를 자극하는 표현이 감지됐습니다.',
  },

  // ── 범주 4: 취약층 이용형 (EXPLOITING) ───────────────

  {
    id: 'E-01',
    category: 'EXPLOITING',
    label: '노인·취약계층 타겟 표현',
    pattern: /시니어|어르신|노후\s*(준비|설계|보장)|은퇴\s*(후|설계|자금)/,
    weight: 10,
    evidence: '고령자·은퇴 타겟 표현이 감지됐습니다. UI 접근성과 설명 충분성을 확인하세요.',
  },
  {
    id: 'E-02',
    category: 'EXPLOITING',
    label: '사전 동의 체크박스 의심',
    pattern: /동의\s*(합니다|함|체크)|이벤트\s*수신\s*동의|마케팅\s*활용\s*동의/,
    weight: 20,
    evidence: '동의 관련 텍스트가 감지됐습니다. 기본값이 체크(pre-checked) 상태인지 확인하세요.',
  },
  {
    id: 'E-03',
    category: 'EXPLOITING',
    label: '공포·불안 자극 문구',
    pattern: /갑작스러운\s*(사고|질병|입원)|만약에\s*(대비|대한)|혹시\s*모를\s*위험/,
    weight: 15,
    evidence: '공포·불안을 자극하는 보험 관련 표현이 감지됐습니다.',
  },
  {
    id: 'E-04',
    category: 'EXPLOITING',
    label: '복잡한 약관 단순화 강조',
    pattern: /복잡한\s*약관|쉽게\s*설명|한눈에\s*보는|간단\s*(하게|히)\s*가입/,
    weight: 10,
    evidence: '"복잡한 약관을 쉽게" 등 약관 간소화 표현이 감지됐습니다. 중요 정보 누락 여부를 확인하세요.',
  },
];

// ─────────────────────────────────────────────
// 매칭 함수
// ─────────────────────────────────────────────

/**
 * OCR 텍스트에 패턴 규칙을 적용하여 매칭된 규칙 목록 반환
 *
 * @param {string} text  OCR 추출 텍스트
 * @returns {MatchedRule[]}
 *
 * MatchedRule:
 *   {
 *     id, category, label, weight, evidence,
 *     matchedText: string  // 실제 매칭된 텍스트 일부
 *   }
 */
function matchRules(text) {
  if (!text || typeof text !== 'string') return [];

  const matched = [];

  for (const rule of RULES) {
    const result = rule.pattern.exec(text);
    if (result) {
      matched.push({
        id: rule.id,
        category: rule.category,
        label: rule.label,
        weight: rule.weight,
        evidence: rule.evidence,
        matchedText: result[0].trim(), // 실제 매칭 텍스트
      });
    }
  }

  return matched;
}

/**
 * 매칭 결과로부터 카테고리별 총 가산점 계산
 * → reportBuilder에서 risk_score 보정에 사용
 *
 * @param {MatchedRule[]} matchedRules
 * @returns {{ [category: string]: number }}
 */
function calcWeightByCategory(matchedRules) {
  return matchedRules.reduce((acc, rule) => {
    acc[rule.category] = (acc[rule.category] ?? 0) + rule.weight;
    return acc;
  }, {});
}

module.exports = { matchRules, calcWeightByCategory, RULES };
