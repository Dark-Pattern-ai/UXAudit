import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/common/Card';

interface HistoryItem {
  reportId: string;
  analyzedAt: string;
  serviceName: string;
  totalDetected: number;
  overallRiskScore: number;
  overallCategory: string;
}

const HistoryPage = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem('uxaudit_history');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        // 최신순 정렬
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
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">진단 이력</h1>
        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="text-sm text-red-500 hover:underline cursor-pointer"
          >
            전체 삭제
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <Card>
          <p className="text-gray-500 text-center py-10">
            아직 진단 이력이 없습니다. 홈에서 분석을 시작해 보세요.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {history.map((item) => (
            <div
              key={item.reportId}
              onClick={() => {
                // 로컬스토리지에서 전체 리포트 데이터 가져와서 state로 넘김
                const raw = localStorage.getItem(`uxaudit_report_${item.reportId}`);
                const reportData = raw ? JSON.parse(raw) : null;
                navigate(`/report/${item.reportId}`, { state: { report: reportData } });
              }}
              className="flex items-center justify-between bg-white border border-gray-200
                         rounded-xl px-5 py-4 cursor-pointer hover:border-blue-300
                         hover:shadow-sm transition-all"
            >
              <div>
                <p className="font-medium text-gray-900">
                  {item.serviceName || '분석 서비스'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(item.analyzedAt).toLocaleString('ko-KR')}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-xs text-gray-400">탐지</p>
                  <p className="font-bold text-red-500">{item.totalDetected}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400">위험도</p>
                  <p className="font-bold text-yellow-500">{item.overallRiskScore}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
