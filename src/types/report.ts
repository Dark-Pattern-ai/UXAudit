import type { DetectedPattern, PatternCategoryKey } from './pattern';

/** 업로드된 이미지 */
export interface UploadedImage {
  id: string;
  fileName: string;
  url: string;
  pageLabel?: string;
}

/** 가이드라인 준수 여부 */
export interface GuidelineCompliance {
  category: PatternCategoryKey;
  isCompliant: boolean;
  details: string;
}

/** 진단 리포트 전체 */
export interface DiagnosisReport {
  id: string;
  serviceName: string;
  analyzedAt: string;
  overallRiskScore: number;
  totalDetected: number;
  detectedPatterns: DetectedPattern[];
  guidelineCompliance: GuidelineCompliance[];
  summary: string;
  uploadedImages: UploadedImage[];
}
