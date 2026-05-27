import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface HistoryItem {
  reportId: string;
  analyzedAt: string;
  serviceName: string;
  totalDetected: number;
  overallRiskScore: number;
  overallCategory: string;
}

const riskScoreColor = (score: number) => {
  if (score <= 20) return 'var(--safe)';
  if (score <= 40) return '#2563eb';
  if (score <= 60) return '#d97706';
  if (score <= 80) return '#ea580c';
  return 'var(--red)';
};

const HistoryPage = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem('uxaudit_history');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        parsed.sort((a: HistoryItem, b: HistoryItem) =>
          new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime()
        );
        setHistory(parsed);
      } catch {
        setHistory([]);
      }
    }
  }, []);

  const clearHistory = () => {
    localStorage.removeItem('uxaudit_history');
    setHistory([]);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="mb-7 pb-5" style={{ borderBottom: '2px solid var(--navy)' }}>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1"
              style={{ color: 'var(--navy)' }}>
              UXAudit
            </p>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>진단 이력</h1>
          </div>
          {history.length > 0 && (
            <button onClick={clearHistory}
              className="text-xs font-medium hover:underline cursor-pointer"
              style={{ color: 'var(--red)' }}>
              전체 삭제
            </button>
          )}
        </div>
      </div>

      {history.length === 0 ? (
        <div className="rounded-lg p-12 text-center"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            아직 진단 이력이 없습니다. 홈에서 분석을 시작해 보세요.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* 테이블 헤더 */}
          <div className="grid grid-cols-12 px-5 py-2 text-xs font-semibold uppercase tracking-wide"
            style={{ color: 'var(--text-secondary)' }}>
            <span className="col-span-5">서비스명</span>
            <span className="col-span-4">진단 일시</span>
            <span className="col-span-1 text-center">탐지</span>
            <span className="col-span-2 text-center">위험도</span>
          </div>

          {history.map((item, idx) => (
            <div
              key={item.reportId}
              onClick={() => {
                const raw = localStorage.getItem(`uxaudit_report_${item.reportId}`);
                const reportData = raw ? JSON.parse(raw) : null;
                navigate(`/report/${item.reportId}`, { state: { report: reportData } });
              }}
              className="grid grid-cols-12 items-center px-5 py-4 rounded-lg cursor-pointer transition-all"
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--navy)';
                (e.currentTarget as HTMLDivElement).style.backgroundColor = '#f5f8ff';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
                (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--surface)';
              }}
            >
              <div className="col-span-5 flex items-center gap-3">
                <span className="text-xs w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: '#eef2f7', color: 'var(--text-secondary)' }}>
                  {idx + 1}
                </span>
                <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                  {item.serviceName || '분석 서비스'}
                </p>
              </div>
              <div className="col-span-4">
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {new Date(item.analyzedAt).toLocaleString('ko-KR')}
                </p>
              </div>
              <div className="col-span-1 text-center">
                <span className="text-sm font-bold"
                  style={{ color: item.totalDetected > 0 ? 'var(--red)' : 'var(--safe)' }}>
                  {item.totalDetected}
                </span>
              </div>
              <div className="col-span-2 flex justify-center">
                <span className="text-xs font-bold px-2.5 py-1 rounded"
                  style={{
                    backgroundColor: riskScoreColor(item.overallRiskScore) + '18',
                    color: riskScoreColor(item.overallRiskScore),
                    border: `1px solid ${riskScoreColor(item.overallRiskScore)}40`,
                  }}>
                  {item.overallRiskScore}점
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
