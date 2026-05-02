const API_URL = 'http://127.0.0.1:8000';

export async function analyzeImages(
  files: File[],
  onProgress?: (current: number, total: number) => void
) {
  const results = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.(i + 1, files.length);

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/analyze`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`API 호출 실패: ${response.status}`);
    }

    const result = await response.json();
    results.push({ ...result, fileName: file.name });
  }

  const reportId = `rpt-${Date.now()}`;
  const report = {
    id: reportId,
    results,
    totalFiles: files.length,
    analyzedAt: new Date().toISOString(),
  };

  // localStorage에 저장
  localStorage.setItem(reportId, JSON.stringify(report));

  return report;
}
