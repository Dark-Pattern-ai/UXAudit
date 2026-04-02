/**
 * mockAI.js
 *
 * 역할: AI 서버 없이 백엔드를 단독으로 테스트하기 위한 목(Mock) 응답 모듈
 *
 * 사용법:
 *   환경변수 USE_MOCK_AI=true 로 서버를 실행하면 이 모듈이 callAIServer 대신 호출된다.
 *   어떤 카테고리를 테스트할지는 MOCK_CATEGORY 환경변수로 지정한다.
 *
 *   USE_MOCK_AI=true MOCK_CATEGORY=PRESSURING npm run dev
 *
 *   MOCK_CATEGORY 미지정 시 → 매 요청마다 5개 카테고리를 순환한다. (라운드로빈)
 */

const MOCK_RESPONSES = {
  NORMAL: {
    category: 'NORMAL',
    risk_score: 0,
    confidence: 0.97,
  },
  MISLEADING: {
    category: 'MISLEADING',
    risk_score: 55,
    confidence: 0.88,
  },
  OBSTRUCTING: {
    category: 'OBSTRUCTING',
    risk_score: 72,
    confidence: 0.91,
  },
  PRESSURING: {
    category: 'PRESSURING',
    risk_score: 78,
    confidence: 0.85,
  },
  EXPLOITING: {
    category: 'EXPLOITING',
    risk_score: 91,
    confidence: 0.93,
  },
};

const CATEGORIES = Object.keys(MOCK_RESPONSES);
let roundRobinIndex = 0;

/**
 * Mock AI 응답 반환
 *
 * @returns {{ category: string, risk_score: number, confidence: number }}
 */
function getMockAIResult() {
  // 환경변수로 고정 카테고리 지정 가능
  const fixed = process.env.MOCK_CATEGORY?.toUpperCase();
  if (fixed && MOCK_RESPONSES[fixed]) {
    console.log(`[MockAI] 고정 카테고리 사용: ${fixed}`);
    return MOCK_RESPONSES[fixed];
  }

  // 미지정 → 라운드로빈 순환
  const category = CATEGORIES[roundRobinIndex % CATEGORIES.length];
  roundRobinIndex += 1;
  console.log(`[MockAI] 라운드로빈 카테고리: ${category} (${roundRobinIndex}번째 요청)`);
  return MOCK_RESPONSES[category];
}

module.exports = { getMockAIResult };
