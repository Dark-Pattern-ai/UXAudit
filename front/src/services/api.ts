import axios from 'axios';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || 'http://localhost:3000/api';

/** 백엔드 1장 분석 응답 타입 */
export interface AIAnalyzeResponse {
  report: {
    category: string;
    categoryLabel: string;
    overallRiskScore: number;
    riskLevel: string;
    summary: string;
    totalDetected: number;
    detectedPatterns: {
      id: number;
      category: string;
      patternName: string;
      riskLevel: string;
      description: string;
      recommendation: string;
      location: string | null;
      sourceImageId: string | null;
      matchedText?: string;
    }[];
    guidelineCompliance: {
      category: string;
      isCompliant: boolean;
      details: string;
    }[];
    suggestions: string[];
    ocr: {
      text: string;
      confidence: number;
      success: boolean;
    };
    confidence: number;
    analyzedAt: string;
  };
}

/** 이미지 1장 분석 요청 */
export async function analyzeImage(file: File): Promise<AIAnalyzeResponse> {
  const formData = new FormData();
  formData.append('image', file);

  const response = await axios.post<AIAnalyzeResponse>(
    `${API_BASE}/analyze`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    }
  );

  return response.data;
}

/** 여러 장 분석 (순차 호출 후 결과 병합) */
export async function analyzeImages(
  files: File[],
  onProgress?: (current: number, total: number) => void
) {
  const results: AIAnalyzeResponse[] = [];

  for (let i = 0; i < files.length; i++) {
    onProgress?.(i + 1, files.length);
    const result = await analyzeImage(files[i]);
    results.push(result);
  }

  return mergeReports(results, files);
}

/** 여러 장의 분석 결과를 하나의 리포트로 병합 */
function mergeReports(results: AIAnalyzeResponse[], files: File[]) {
  let patternId = 1;
  const allPatterns: AIAnalyzeResponse['report']['detectedPatterns'] = [];
  const categoryViolations = new Set<string>();

  results.forEach((res, index) => {
    res.report.detectedPatterns.forEach((p) => {
      allPatterns.push({
        ...p,
        id: patternId++,
        sourceImageId: `img-${index}`,
        location: files[index].name,
      });
      categoryViolations.add(p.category);
    });
  });

  // 가장 높은 위험도 점수 사용
  const maxScore = Math.max(...results.map((r) => r.report.overallRiskScore));

  // guidelineCompliance 병합
  const categories = ['MISLEADING', 'OBSTRUCTING', 'PRESSURING', 'EXPLOITING'] as const;
  const guidelineCompliance = categories.map((cat) => ({
    category: cat,
    isCompliant: !categoryViolations.has(cat),
    details: categoryViolations.has(cat)
      ? `${cat} 패턴 탐지됨`
      : '위반 없음',
  }));

  // uploadedImages 생성
  const uploadedImages = files.map((file, index) => ({
    id: `img-${index}`,
    fileName: file.name,
    url: URL.createObjectURL(file),
    pageLabel: file.name.replace(/\.[^/.]+$/, ''),
  }));

  return {
    id: `rpt-${Date.now()}`,
    serviceName: '',
    analyzedAt: new Date().toISOString(),
    overallRiskScore: maxScore,
    totalDetected: allPatterns.length,
    summary:
      allPatterns.length > 0
        ? `총 ${files.length}장의 화면에서 ${allPatterns.length}건의 다크패턴이 탐지되었습니다.`
        : '다크패턴이 탐지되지 않았습니다.',
    uploadedImages,
    detectedPatterns: allPatterns,
    guidelineCompliance,
  };
}
