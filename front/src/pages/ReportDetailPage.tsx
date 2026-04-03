import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Card from '../components/common/Card';
import { getReportById } from '../constants/mockData';
import { CATEGORY_CONFIG, RISK_LEVEL_CONFIG } from '../constants/patternTypes';
import type { PatternCategoryKey, RiskLevel } from '../types';

const ReportPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // API 결과가 state로 넘어오면 사용, 아니면 mock 데이터 사용
  const report = (location.state as { report?: any })?.report || getReportById(id || '');

  if (!report) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">리포트를 찾을 수 없습니다.</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 text-blue-600 hover:underline text-sm cursor-pointer"
        >
          홈으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* 상단 헤더 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">진단 결과 대시보드</h1>
        <p className="text-sm text-gray-500">
          {report.serviceName} · {new Date(report.analyzedAt).toLocaleString('ko-KR')}
        </p>
      </div>

      {/* 상단 요약 카드 3칸 */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card>
          <p className="text-xs text-gray-500 mb-1">탐지된 다크패턴</p>
          <p className="text-4xl font-bold text-red-500">{report.totalDetected}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500 mb-1">UX 위험도 점수</p>
          <p className="text-4xl font-bold text-yellow-500">{report.overallRiskScore}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500 mb-1">분석 완료 화면</p>
          <p className="text-4xl font-bold text-gray-900">{report.uploadedImages?.length ?? 0}</p>
        </Card>
      </div>

      {/* 가이드라인 준수 현황 */}
      <Card className="mb-8">
        <p className="text-sm font-medium text-gray-700 mb-3">금융위 가이드라인 준수 현황</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {report.guidelineCompliance.map((item: any) => {
            const catKey = item.category as PatternCategoryKey;
            const config = CATEGORY_CONFIG[catKey];
            if (!config) return null;

            return (
              <div
                key={item.category}
                className={`rounded-lg p-3 border ${
                  item.isCompliant
                    ? 'border-green-200 bg-green-50'
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium" style={{ color: config.color }}>
                    {config.icon} {config.label}
                  </span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      item.isCompliant
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {item.isCompliant ? '준수' : '위반'}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{item.details}</p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* 종합 소견 */}
      <Card className="mb-8">
        <p className="text-sm font-medium text-gray-700 mb-2">종합 소견</p>
        <p className="text-sm text-gray-600 leading-relaxed">{report.summary}</p>
      </Card>

      {/* 탐지된 다크패턴 목록 */}
      <h2 className="text-lg font-bold text-gray-900 mb-4">탐지된 다크패턴 목록</h2>
      <div className="space-y-3">
        {report.detectedPatterns.map((pattern: any) => {
          const catKey = pattern.category as PatternCategoryKey;
          const riskKey = pattern.riskLevel as RiskLevel;
          const catConfig = CATEGORY_CONFIG[catKey];
          const riskConfig = RISK_LEVEL_CONFIG[riskKey];

          if (!catConfig || !riskConfig) return null;

          return (
            <div
              key={pattern.id}
              onClick={() => navigate(`/report/${report.id}/detail/${pattern.id}`, { state: { report } })}
              className="flex items-center justify-between bg-white border border-gray-200
                         rounded-xl px-5 py-4 cursor-pointer hover:border-blue-300
                         hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: riskConfig.color }}
                />
                <span className="font-medium text-gray-900">{pattern.patternName}</span>
              </div>
              <div className="flex items-center gap-3">
                {pattern.location && (
                  <span className="text-xs text-gray-400 hidden sm:block">
                    {pattern.location}
                  </span>
                )}
                <span
                  className="text-xs font-medium px-2.5 py-1 rounded-full"
                  style={{
                    backgroundColor: riskConfig.bgColor,
                    color: riskConfig.color,
                  }}
                >
                  {riskConfig.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ReportPage;
