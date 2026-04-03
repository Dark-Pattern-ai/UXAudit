import type { PatternCategoryKey } from '../types';

interface CategoryConfig {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
  description: string;
}

export const CATEGORY_CONFIG: Record<PatternCategoryKey, CategoryConfig> = {
  NORMAL: {
  label: '정상',
  color: '#6B7280',
  bgColor: '#F3F4F6',
  icon: '✅',
  description: '다크패턴이 감지되지 않은 정상 화면',
},
  MISLEADING: {
    label: '오도형',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    icon: '⚠️',
    description: '거짓 또는 왜곡된 정보로 소비자를 오도하는 행위',
  },
  OBSTRUCTING: {
    label: '방해형',
    color: '#EF4444',
    bgColor: '#FEE2E2',
    icon: '🚫',
    description: '소비자의 취소·해지 등 권리 행사를 방해하는 행위',
  },
  PRESSURING: {
    label: '압박형',
    color: '#8B5CF6',
    bgColor: '#EDE9FE',
    icon: '😰',
    description: '심리적 압박을 통해 소비자의 판단을 흐리는 행위',
  },
  EXPLOITING: {
    label: '편취유도형',
    color: '#EC4899',
    bgColor: '#FCE7F3',
    icon: '💸',
    description: '가격 정보를 순차적으로 공개하여 비용을 숨기는 행위',
  },
};

export const PATTERN_TYPES = [
  // 오도형 (5개)
  { id: 1,  category: 'MISLEADING'  as const, name: '설명절차의 과도한 축약' },
  { id: 2,  category: 'MISLEADING'  as const, name: '속임수 질문' },
  { id: 3,  category: 'MISLEADING'  as const, name: '잘못된 계층구조' },
  { id: 4,  category: 'MISLEADING'  as const, name: '특정 옵션 사전선택' },
  { id: 5,  category: 'MISLEADING'  as const, name: '허위광고 및 기만적 유인행위' },
  // 방해형 (4개)
  { id: 6,  category: 'OBSTRUCTING' as const, name: '취소·해지·탈퇴 방해' },
  { id: 7,  category: 'OBSTRUCTING' as const, name: '숨겨진 정보 제공' },
  { id: 8,  category: 'OBSTRUCTING' as const, name: '가격비교 방해' },
  { id: 9,  category: 'OBSTRUCTING' as const, name: '클릭 피로감 유발' },
  // 압박형 (5개)
  { id: 10, category: 'PRESSURING'  as const, name: '계약과정 중 기습적 광고' },
  { id: 11, category: 'PRESSURING'  as const, name: '반복 간섭' },
  { id: 12, category: 'PRESSURING'  as const, name: '감정적 언어 사용' },
  { id: 13, category: 'PRESSURING'  as const, name: '감각 조작' },
  { id: 14, category: 'PRESSURING'  as const, name: '다른 소비자의 활동 알림' },
  // 편취유도형 (1개)
  { id: 15, category: 'EXPLOITING'  as const, name: '순차공개 가격책정' },
] as const;

export const RISK_LEVEL_CONFIG = {
  HIGH:   { label: '높음', color: '#EF4444', bgColor: '#FEE2E2' },
  MEDIUM: { label: '보통', color: '#F59E0B', bgColor: '#FEF3C7' },
  LOW:    { label: '낮음', color: '#22C55E', bgColor: '#DCFCE7' },
} as const;
