import axios from 'axios';

const API_BASE = 'http://localhost:3000/api';

/** 이미지 1장 분석 응답 타입 */
export interface AIAnalyzeResponse {
  report: {
    id?: string;
    serviceName?: string;
    category: string;
    categoryLabel: string;
    overallRiskScore: number;
    riskLevel: string;
    summary: string;
    totalDetected: number;
    analyzedAt: string;
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
      timeout: 180000,
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

  const merged = mergeReports(results, files);

  // 병합된 리포트를 히스토리에 저장
  const historyItem = {
    reportId: merged.id,
    analyzedAt: merged.analyzedAt,
    serviceName: merged.serviceName || '분석 서비스',
    totalDetected: merged.totalDetected,
    overallRiskScore: merged.overallRiskScore,
    overallCategory: merged.detectedPatterns[0]?.category || 'NORMAL',
  };
  const raw = localStorage.getItem('uxaudit_history');
  const history = raw ? JSON.parse(raw) : [];
  // 중복 제거 후 추가
  const filtered = history.filter((h: any) => h.reportId !== merged.id);
  filtered.unshift(historyItem);
  localStorage.setItem('uxaudit_history', JSON.stringify(filtered.slice(0, 20)));

  // 전체 리포트 데이터 별도 저장 (진단이력 상세 조회용)
  localStorage.setItem(`uxaudit_report_${merged.id}`, JSON.stringify(merged));

  return merged;
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

  const avgScore = Math.round(
  results.map((r) => r.report.overallRiskScore).reduce((a, b) => a + b, 0) / results.length
);

  const categories = ['MISLEADING', 'OBSTRUCTING', 'PRESSURING', 'EXPLOITING'] as const;
  const guidelineCompliance = categories.map((cat) => ({
    category: cat,
    isCompliant: !categoryViolations.has(cat),
    details: categoryViolations.has(cat) ? `${cat} 패턴 탐지됨` : '위반 없음',
  }));

  const uploadedImages = files.map((file, index) => ({
    id: `img-${index}`,
    fileName: file.name,
    url: URL.createObjectURL(file),
    pageLabel: file.name.replace(/\.[^/.]+$/, ''),
  }));

  // 첫 번째 결과의 reportId 사용 (DB 실제 ID)
  const reportId = results[0]?.report?.id || `rpt-${Date.now()}`;

  return {
    id: reportId,
    serviceName: '',
    analyzedAt: new Date().toISOString(),
    overallRiskScore: avgScore,
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
