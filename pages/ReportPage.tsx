import { useNavigate, useParams, useLocation } from 'react-router-dom';
import Card from '../components/common/Card';
import { CATEGORY_CONFIG, RISK_LEVEL_CONFIG } from '../constants/patternTypes';

const ReportPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  // location.state 또는 localStorage에서 리포트 데이터 가져오기
  let report = location.state?.report;
  if (!report && id) {
    const stored = localStorage.getItem(id);
    if (stored) report = JSON.parse(stored);
  }

  if (!report) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">리포트를 찾을 수 없습니다.</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg"
        >
          홈으로
        </button>
      </div>
    );
  }

  // API 결과에서 데이터 추출
  const results = report.results || [];
  const darkPatterns = results.filter((r: any) => r.final_result?.is_dark_pattern);
  const totalDetected = darkPatterns.length;
  const avgScore = results.length > 0
    ? Math.round(results.reduce((sum: number, r: any) => 
        sum + (r.final_result?.severity_score || 0), 0) / results.length * 33)
    : 0;

  return (
    <div className="max-w-4xl mx-auto">
      {/* 상단 헤더 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">진단 결과 대시보드</h1>
        <p className="text-sm text-gray-500">
          {report.serviceName || '분석 서비스'} · {new Date(report.analyzedAt).toLocaleString('ko-KR')}
        </p>
      </div>

      {/* 상단 요약 카드 3칸 */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card>
          <p className="text-xs text-gray-500 mb-1">탐지된 다크패턴</p>
          <p className="text-4xl font-bold text-red-500">{totalDetected}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500 mb-1">UX 위험도 점수</p>
          <p className="text-4xl font-bold text-yellow-500">{avgScore}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500 mb-1">분석 완료 화면</p>
          <p className="text-4xl font-bold text-gray-900">{results.length}</p>
        </Card>
      </div>

      {/* 종합 소견 */}
      {darkPatterns.length > 0 && (
        <Card className="mb-8">
          <p className="text-sm font-medium text-gray-700 mb-2">종합 소견</p>
          <p className="text-sm text-gray-600 leading-relaxed">
            {darkPatterns[0]?.final_result?.executive_summary || '분석 결과가 없습니다.'}
          </p>
        </Card>
      )}

      {/* 탐지된 다크패턴 목록 */}
      <h2 className="text-lg font-bold text-gray-900 mb-4">탐지된 다크패턴 목록</h2>
      {darkPatterns.length === 0 ? (
        <Card>
          <p className="text-center text-green-600 font-medium py-8">
            ✅ 다크패턴이 탐지되지 않았습니다!
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {darkPatterns.map((result: any, index: number) => {
            const patterns = result.detailed_analysis?.patterns_detected || [];
            return patterns.map((pattern: any, pIndex: number) => (
              <div
                key={`${index}-${pIndex}`}
                onClick={() => navigate(`/report/${id}/detail/${index}-${pIndex}`, {
                  state: { pattern, result }
                })}
                className="flex items-center justify-between bg-white border border-gray-200 
                           rounded-xl px-5 py-4 cursor-pointer hover:border-blue-300 
                           hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full flex-shrink-0 ${
                    pattern.severity === 'HIGH' ? 'bg-red-500' :
                    pattern.severity === 'MEDIUM' ? 'bg-yellow-500' : 'bg-green-500'
                  }`} />
                  <span className="font-medium text-gray-900">{pattern.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{result.fileName}</span>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    pattern.severity === 'HIGH' ? 'bg-red-100 text-red-700' :
                    pattern.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {pattern.severity === 'HIGH' ? '높음' :
                     pattern.severity === 'MEDIUM' ? '중간' : '낮음'}
                  </span>
                </div>
              </div>
            ));
          })}
        </div>
      )}
    </div>
  );
};

export default ReportPage;
