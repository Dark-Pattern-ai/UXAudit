/** 다크패턴 위험도 레벨 */
export type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';

/** 다크패턴 대분류 (금융위 가이드라인 4개 범주) */
export type PatternCategoryKey =
  | 'NORMAL' //정상
  | 'MISLEADING' //오도형
  | 'OBSTRUCTING' //방해형
  | 'PRESSURING' //압박형
  | 'EXPLOITING'; //편취유도형

/** 탐지된 개별 다크패턴 */
export interface DetectedPattern {
  id: number;
  category: PatternCategoryKey;
  patternName: string;
  riskLevel: RiskLevel;
  description: string;
  recommendation: string;
  screenshotUrl?: string;
  location?: string;
}
