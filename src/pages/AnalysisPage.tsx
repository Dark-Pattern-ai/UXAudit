import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface AnalysisStep {
  label: string;
  status: 'done' | 'active' | 'waiting';
}

const STEPS: string[] = [
  '이미지 전처리',
  'CLIP 임베딩 생성',
  '다크패턴 분류 모델 추론',
  '위험도 점수 계산',
  '진단 리포트 생성',
];

const AnalysisPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { serviceName?: string; imageCount?: number } | null;

  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // 단계별 진행 시뮬레이션
    const stepDuration = 600; // 각 단계 0.6초
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 1;
      });
    }, 30);

    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= STEPS.length - 1) {
          clearInterval(stepInterval);
          return prev;
        }
        return prev + 1;
      });
    }, stepDuration);

    // 완료 후 리포트 페이지로 이동
    const timer = setTimeout(() => {
      navigate('/report/rpt-001');
    }, 3500);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stepInterval);
      clearTimeout(timer);
    };
  }, [navigate]);

  // 각 단계의 상태 계산
  const getSteps = (): AnalysisStep[] => {
    return STEPS.map((label, index) => ({
      label,
      status:
        index < currentStep ? 'done' : index === currentStep ? 'active' : 'waiting',
    }));
  };

  // 현재 단계 라벨
  const currentLabel =
    progress >= 100 ? '완료!' : `${STEPS[currentStep]} 중...`;

  return (
    <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[70vh]">
      {/* 타이틀 */}
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        스크린샷을 분석하고 있습니다
      </h2>
      {state?.imageCount && (
        <p className="text-gray-500 mb-10">
          {state.imageCount}장의 화면에서 다크패턴을 탐지 중입니다
        </p>
      )}

      {/* 프로그레스 바 */}
      <div className="w-full mb-8">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-700">{currentLabel}</p>
          <p className="text-sm font-medium text-gray-500">{progress}%</p>
        </div>
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 단계 리스트 */}
      <div className="w-full space-y-3">
        {getSteps().map((step, index) => (
          <div key={index} className="flex items-center gap-3">
            {/* 상태 아이콘 */}
            {step.status === 'done' && (
              <span className="w-5 h-5 flex items-center justify-center rounded-full bg-green-500">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </span>
            )}
            {step.status === 'active' && (
              <span className="w-5 h-5 flex items-center justify-center">
                <span className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
              </span>
            )}
            {step.status === 'waiting' && (
              <span className="w-5 h-5 flex items-center justify-center">
                <span className="w-3 h-3 bg-gray-300 rounded-full" />
              </span>
            )}

            {/* 라벨 */}
            <span
              className={`text-sm ${
                step.status === 'done'
                  ? 'text-green-600'
                  : step.status === 'active'
                  ? 'text-yellow-600 font-medium'
                  : 'text-gray-400'
              }`}
            >
              {step.label}
              {step.status === 'done' && ' 완료'}
              {step.status === 'active' && ' 중...'}
            </span>
          </div>
        ))}
      </div>

      {/* 하단 서비스 정보 */}
      {state?.serviceName && (
        <p className="text-xs text-gray-400 mt-10">
          분석 대상: {state.serviceName}
        </p>
      )}
    </div>
  );
};

export default AnalysisPage;
