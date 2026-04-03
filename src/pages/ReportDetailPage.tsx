import { useParams, useNavigate } from 'react-router-dom';
import Card from '../components/common/Card';
import { getReportById } from '../constants/mockData';
import { CATEGORY_CONFIG, RISK_LEVEL_CONFIG } from '../constants/patternTypes';

const ReportDetailPage = () => {
  const { id, patternId } = useParams();
  const navigate = useNavigate();
  const report = getReportById(id || '');

  if (!report) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
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

  const pattern = report.detectedPatterns.find(
    (p) => p.id === Number(patternId)
  );

  if (!pattern) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <p className="text-gray-500">해당 패턴 정보를 찾을 수 없습니다.</p>
        <button
          onClick={() => navigate(`/report/${id}`)}
          className="mt-4 text-blue-600 hover:underline text-sm cursor-pointer"
        >
          결과 목록으로 돌아가기
        </button>
      </div>
    );
  }

  const catConfig = CATEGORY_CONFIG[pattern.category];
  const riskConfig = RISK_LEVEL_CONFIG[pattern.riskLevel];

  return (
    <div className="max-w-3xl mx-auto">
      {/* 뒤로가기 */}
      <button
        onClick={() => navigate(`/report/${id}`)}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600
                   transition-colors mb-6 cursor-pointer"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        결과 목록으로
      </button>

      {/* 상단 헤더 */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-lg"
            style={{ backgroundColor: catConfig.bgColor }}
          >
            {catConfig.icon}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-gray-900">
                {pattern.patternName}
              </h1>
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
            <p className="text-sm text-gray-500">
              {report.serviceName} · {catConfig.label} · {pattern.location || '위치 미상'}
            </p>
          </div>
        </div>
      </div>

      {/* 탐지된 위치 */}
      <h2 className="text-base font-bold text-gray-900 mb-3">탐지된 위치</h2>
      <Card className="mb-8">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
          <p className="text-xs text-gray-400 mb-3">
            {pattern.location || '화면'} 미리보기 (시뮬레이션)
          </p>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            {pattern.category === 'OBSTRUCTING' && (
              <div className="space-y-3">
                <p className="font-medium text-gray-900 text-sm">구독 관리</p>
                <p className="text-xs text-gray-400">
                  설정 {'>'} 계정관리 {'>'} 서비스 {'>'} 구독해지
                </p>
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg">
                    구독 유지
                  </button>
                  <button className="px-4 py-2 text-xs rounded-lg" style={{ color: '#d1d5db', border: '1px solid #e5e7eb' }}>
                    해지
                  </button>
                </div>
              </div>
            )}
            {pattern.category === 'PRESSURING' && (
              <div className="space-y-3">
                <p className="font-medium text-gray-900 text-sm">알림 / 확인 팝업</p>
                <div
                  className="border rounded-lg p-3"
                  style={{ borderColor: riskConfig.color, backgroundColor: riskConfig.bgColor }}
                >
                  <p className="text-sm" style={{ color: riskConfig.color }}>
                    ★ 탐지됨: "{pattern.description.slice(0, 60)}..."
                  </p>
                </div>
              </div>
            )}
            {pattern.category === 'MISLEADING' && (
              <div className="space-y-3">
                <p className="font-medium text-gray-900 text-sm">상품 가입 / 약관 동의</p>
                <div
                  className="border rounded-lg p-3"
                  style={{ borderColor: riskConfig.color, backgroundColor: riskConfig.bgColor }}
                >
                  <p className="text-sm" style={{ color: riskConfig.color }}>
                    ★ 탐지됨: "{pattern.description.slice(0, 60)}..."
                  </p>
                </div>
              </div>
            )}
            {pattern.category === 'EXPLOITING' && (
              <div className="space-y-3">
                <p className="font-medium text-gray-900 text-sm">가입 최종 확인</p>
                <div
                  className="border rounded-lg p-3"
                  style={{ borderColor: riskConfig.color, backgroundColor: riskConfig.bgColor }}
                >
                  <p className="text-sm" style={{ color: riskConfig.color }}>
                    ★ 탐지됨: "{pattern.description.slice(0, 60)}..."
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">{pattern.description}</p>
      </Card>

      {/* 개선 제안 */}
      <h2 className="text-base font-bold text-gray-900 mb-3">개선 제안</h2>
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-8">
        <p className="text-sm font-semibold text-blue-900 mb-2">권장 조치</p>
        <p className="text-sm text-blue-800 leading-relaxed">
          {pattern.recommendation}
        </p>
      </div>

      {/* 관련 가이드라인 */}
      <h2 className="text-base font-bold text-gray-900 mb-3">관련 가이드라인</h2>
      <Card>
        <div className="flex items-center gap-3 mb-3">
          <span
            className="px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ backgroundColor: catConfig.bgColor, color: catConfig.color }}
          >
            {catConfig.icon} {catConfig.label}
          </span>
          <span className="text-sm text-gray-700 font-medium">
            금융위원회 다크패턴 가이드라인
          </span>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed">
          {catConfig.description}
        </p>
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            출처: 금융위원회「온라인 금융상품 판매 관련 다크패턴 가이드라인」(2026.4 시행)
          </p>
        </div>
      </Card>
    </div>
  );
};

export default ReportDetailPage;
