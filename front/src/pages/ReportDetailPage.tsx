import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Card from '../components/common/Card';
import { CATEGORY_CONFIG, RISK_LEVEL_CONFIG } from '../constants/patternTypes';
import { loadFromIDB } from '../services/api';
import type { PatternCategoryKey, RiskLevel } from '../types';

const API_BASE = 'http://localhost:3000/api';

const riskScoreColor = (score: number) => {
  if (score <= 20) return 'var(--safe)';
  if (score <= 40) return '#2563eb';
  if (score <= 60) return '#d97706';
  if (score <= 80) return '#ea580c';
  return 'var(--red)';
};

const riskScoreLabel = (score: number) => {
  if (score <= 20) return '안전';
  if (score <= 40) return '주의';
  if (score <= 60) return '경고';
  if (score <= 80) return '위험';
  return '매우 위험';
};

const ReportDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const reportRef = useRef<HTMLDivElement>(null);
  const [report, setReport] = useState<any>(
    (location.state as { report?: any })?.report || null
  );
  const [loading, setLoading] = useState(!report);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [lightbox, setLightbox] = useState<{ src: string; label: string } | null>(null);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

  // IndexedDB에서 원본 이미지 로드
  useEffect(() => {
    if (!report?.uploadedImages?.length) return;
    (async () => {
      const urls: Record<string, string> = {};
      for (const img of report.uploadedImages) {
        if (img.idbKey) {
          const url = await loadFromIDB(img.idbKey);
          if (url) { urls[img.id] = url; continue; }
        }
        // IDB에 없으면 blob URL 또는 displayUrl로 fallback
        urls[img.id] = img.url || img.displayUrl || '';
      }
      setImageUrls(urls);
    })();
  }, [report]);

  const exportPDF = async () => {
    if (!reportRef.current || !report) return;
    setExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#eef2f7',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW;
      const imgH = (canvas.height * pageW) / canvas.width;

      let heightLeft = imgH;
      let position = 0;
      pdf.addImage(imgData, 'JPEG', 0, position, imgW, imgH);
      heightLeft -= pageH;

      while (heightLeft > 0) {
        position = heightLeft - imgH;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgW, imgH);
        heightLeft -= pageH;
      }

      const date = new Date().toLocaleDateString('ko-KR').replace(/\. /g, '').replace('.', '');
      const name = (report.serviceName || '분석서비스').replace(/\s/g, '_');
      pdf.save(`${name}_진단보고서_${date}.pdf`);
    } catch (e) {
      console.error('PDF 생성 실패:', e);
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (report) return;
    if (!id) return;

    if (id.startsWith('rpt-')) {
      const raw = localStorage.getItem(`uxaudit_report_${id}`);
      if (raw) {
        setReport(JSON.parse(raw));
      } else {
        setError('리포트를 찾을 수 없습니다.');
      }
      setLoading(false);
      return;
    }

    fetch(`${API_BASE}/reports/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setReport(data.report);
        else setError('리포트를 찾을 수 없습니다.');
      })
      .catch(() => setError('리포트를 불러오는 중 오류가 발생했습니다.'))
      .finally(() => setLoading(false));
  }, [id, report]);

  if (loading) {
    return (
      <div className="text-center py-20">
        <p style={{ color: 'var(--text-secondary)' }}>리포트 불러오는 중...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="text-center py-20">
        <p style={{ color: 'var(--text-secondary)' }}>{error || '리포트를 찾을 수 없습니다.'}</p>
        <button onClick={() => navigate('/')}
          className="mt-4 text-sm hover:underline cursor-pointer"
          style={{ color: 'var(--navy)' }}>
          홈으로 돌아가기
        </button>
      </div>
    );
  }

  const score = report.overallRiskScore ?? 0;

  return (
    <div className="max-w-4xl mx-auto">

      {/* 뒤로가기 + PDF 버튼 (PDF에 포함 안 됨) */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate(-1)}
          className="text-xs font-medium flex items-center gap-1 cursor-pointer hover:underline"
          style={{ color: 'var(--navy)' }}>
          ← 뒤로가기
        </button>
        <button
          onClick={exportPDF}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 rounded text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
          style={{ backgroundColor: 'var(--navy)', color: 'white' }}
          onMouseEnter={(e) => { if (!exporting) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--navy-hover)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--navy)'; }}
        >
          {exporting ? (
            <>
              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              생성 중...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              PDF 저장
            </>
          )}
        </button>
      </div>

      {/* PDF 캡처 영역 */}
      <div ref={reportRef}>

      {/* 헤더 */}
      <div className="mb-8">
        <div className="mb-4" />
        <div className="flex items-start justify-between pb-5"
          style={{ borderBottom: '2px solid var(--navy)' }}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1"
              style={{ color: 'var(--navy)' }}>
              진단 결과 보고서
            </p>
            <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>
              {report.serviceName || '분석 서비스'}
            </h1>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {new Date(report.analyzedAt).toLocaleString('ko-KR')}
            </p>
          </div>
          {/* 위험도 점수 배지 */}
          <div className="text-center px-5 py-3 rounded-lg"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1"
              style={{ color: 'var(--text-secondary)' }}>위험도</p>
            <p className="text-3xl font-bold leading-none" style={{ color: riskScoreColor(score) }}>
              {score}
            </p>
            <p className="text-xs font-semibold mt-1" style={{ color: riskScoreColor(score) }}>
              {riskScoreLabel(score)}
            </p>
          </div>
        </div>
      </div>

      {/* 분석 대상 이미지 */}
      {report.uploadedImages?.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide mb-3"
            style={{ color: 'var(--text-secondary)' }}>
            분석 대상 이미지
          </p>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {report.uploadedImages.map((img: any) => (
              <div key={img.id} className="flex-shrink-0 text-center">
                <img
                  src={imageUrls[img.id] || img.displayUrl || img.url}
                  alt={img.fileName}
                  onClick={() => setLightbox({ src: imageUrls[img.id] || img.displayUrl || img.url, label: img.pageLabel || img.fileName })}
                  className="h-44 w-auto rounded-lg object-cover cursor-zoom-in transition-opacity hover:opacity-80"
                  style={{ border: '1px solid var(--border)', maxWidth: '200px' }}
                />
                <p className="text-xs mt-1.5 truncate max-w-[200px]"
                  style={{ color: 'var(--text-secondary)' }}>
                  {img.pageLabel || img.fileName}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 라이트박스 모달 */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            {/* 닫기 버튼 */}
            <button
              onClick={() => setLightbox(null)}
              className="absolute -top-10 right-0 text-white text-sm font-medium hover:opacity-70 cursor-pointer flex items-center gap-1"
            >
              ✕ 닫기
            </button>
            <img
              src={lightbox.src}
              alt={lightbox.label}
              className="w-full h-auto rounded-lg"
              style={{ maxHeight: '80vh', objectFit: 'contain' }}
            />
            {lightbox.label && (
              <p className="text-center text-white text-sm mt-3 opacity-70">{lightbox.label}</p>
            )}
          </div>
        </div>
      )}

      {/* 3개 지표 */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: '탐지된 다크패턴', value: report.totalDetected, color: report.totalDetected > 0 ? 'var(--red)' : 'var(--safe)' },
          { label: 'UX 위험도 점수', value: score, color: riskScoreColor(score) },
          { label: '분석 완료 화면', value: report.uploadedImages?.length ?? 1, color: 'var(--navy)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg p-4"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>
              {label}
            </p>
            <p className="text-4xl font-bold" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* 가이드라인 준수 현황 */}
      <Card className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-wide mb-3"
          style={{ color: 'var(--text-secondary)' }}>
          가이드라인 준수 현황
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {report.guidelineCompliance?.map((item: any) => {
            const catKey = item.category as PatternCategoryKey;
            const config = CATEGORY_CONFIG[catKey];
            if (!config) return null;
            const compliant = item.isCompliant;
            return (
              <div key={item.category} className="rounded p-3"
                style={{
                  backgroundColor: compliant ? 'var(--safe-bg)' : 'var(--red-light)',
                  border: `1px solid ${compliant ? 'var(--safe-border)' : '#f5c0b8'}`,
                }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold" style={{ color: config.color }}>
                    {config.icon} {config.label}
                  </span>
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: compliant ? 'var(--safe)' : 'var(--red)',
                      color: 'white',
                      fontSize: '10px',
                    }}>
                    {compliant ? '준수' : '위반'}
                  </span>
                </div>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{item.details}</p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* 종합 소견 */}
      <Card className="mb-6" accent>
        <p className="text-xs font-semibold uppercase tracking-wide mb-2"
          style={{ color: 'var(--text-secondary)' }}>
          종합 소견
        </p>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>{report.summary}</p>
      </Card>

      {/* 탐지된 다크패턴 목록 */}
      {report.detectedPatterns?.length > 0 && (
        <>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>
              탐지된 다크패턴 목록
            </h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded"
              style={{ backgroundColor: 'var(--red)', color: 'white' }}>
              {report.detectedPatterns.length}건
            </span>
          </div>
          <div className="space-y-3">
            {report.detectedPatterns?.map((pattern: any, idx: number) => {
              const catKey = pattern.category as PatternCategoryKey;
              const riskKey = pattern.riskLevel as RiskLevel;
              const catConfig = CATEGORY_CONFIG[catKey];
              const riskConfig = RISK_LEVEL_CONFIG[riskKey];
              if (!catConfig || !riskConfig) return null;
              return (
                <div key={pattern.id} className="rounded-lg overflow-hidden"
                  style={{ border: '1px solid var(--border)', borderLeft: `4px solid ${riskConfig.color}` }}>
                  <div className="px-5 py-4" style={{ backgroundColor: 'var(--surface)' }}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: riskConfig.color, color: 'white' }}>
                          {idx + 1}
                        </span>
                        <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                          {pattern.patternName}
                        </p>
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded flex-shrink-0 ml-3"
                        style={{ backgroundColor: riskConfig.bgColor, color: riskConfig.color }}>
                        {riskConfig.label}
                      </span>
                    </div>
                    {pattern.description && (
                      <p className="text-sm ml-7 mb-2 leading-relaxed"
                        style={{ color: 'var(--text-secondary)' }}>
                        {pattern.description}
                      </p>
                    )}
                    {pattern.recommendation && (
                      <div className="ml-7 mt-2 px-3 py-2 rounded text-sm"
                        style={{ backgroundColor: '#eef3fb', borderLeft: '3px solid var(--navy)' }}>
                        <span className="font-semibold text-xs" style={{ color: 'var(--navy)' }}>
                          개선 방안
                        </span>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text)' }}>
                          {pattern.recommendation}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {report.detectedPatterns?.length === 0 && (
        <div className="rounded-lg p-8 text-center"
          style={{ backgroundColor: 'var(--safe-bg)', border: '1px solid var(--safe-border)' }}>
          <p className="text-2xl mb-2">✓</p>
          <p className="font-semibold" style={{ color: 'var(--safe)' }}>다크패턴이 탐지되지 않았습니다</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            분석한 화면에서 가이드라인 위반 요소가 발견되지 않았습니다.
          </p>
        </div>
      )}

      </div>{/* /reportRef */}
    </div>
  );
};

export default ReportDetailPage;
