import axios from 'axios';

const API_BASE = 'http://localhost:3000/api';

// ── IndexedDB helpers (원본 품질 이미지 저장) ──────────────────────
const IDB_NAME = 'uxaudit';
const IDB_STORE = 'images';

function openImageDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveToIDB(key: string, file: File): Promise<void> {
  try {
    const db = await openImageDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(file, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('[IDB] 저장 실패:', e);
  }
}

export async function loadFromIDB(key: string): Promise<string | null> {
  try {
    const db = await openImageDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = () =>
        resolve(req.result instanceof Blob ? URL.createObjectURL(req.result) : null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

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

/** 이미지를 base64로 변환하는 공통 함수 */
function fileToBase64(file: File, maxSize: number, quality: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio = Math.min(maxSize / img.width, maxSize / img.height);
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(''); };
    img.src = url;
  });
}

/** 80px 소형 썸네일 (이력 목록용) */
const fileToThumbnail = (file: File) => fileToBase64(file, 80, 0.5);

/** 480px 중간 해상도 (리포트 본문 표시용) */
const fileToDisplayImage = (file: File) => fileToBase64(file, 480, 0.75);

/** 여러 장 분석 (순차 호출 후 결과 병합) */
export async function analyzeImages(
  files: File[],
  serviceName: string = '',
  onProgress?: (current: number, total: number) => void
) {
  const results: AIAnalyzeResponse[] = [];

  for (let i = 0; i < files.length; i++) {
    onProgress?.(i + 1, files.length);
    const result = await analyzeImage(files[i]);
    results.push(result);
  }

  const merged = mergeReports(results, files);
  merged.serviceName = serviceName || '분석 서비스';

  // 썸네일(이력 목록용) 생성 + 원본 파일을 IndexedDB에 저장
  const thumbnailUrl = files.length > 0 ? await fileToThumbnail(files[0]) : '';

  await Promise.all(
    files.map((file, i) => saveToIDB(`${merged.id}_img_${i}`, file))
  );

  // uploadedImages에 idbKey 주입 (원본 조회용)
  merged.uploadedImages = merged.uploadedImages.map((img, i) => ({
    ...img,
    idbKey: `${merged.id}_img_${i}`,
  }));

  // 병합된 리포트를 히스토리에 저장
  const historyItem = {
    reportId: merged.id,
    analyzedAt: merged.analyzedAt,
    serviceName: merged.serviceName,
    totalDetected: merged.totalDetected,
    overallRiskScore: merged.overallRiskScore,
    overallCategory: merged.detectedPatterns[0]?.category || 'NORMAL',
    thumbnailUrl,
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
