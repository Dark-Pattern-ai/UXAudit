import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { analyzeImages } from '../services/api';

const STEPS: string[] = [
  '이미지 전처리',
  'OCR 텍스트 추출',
  '다크패턴 분류 모델 추론',
  'LLM 검증',
  '진단 리포트 생성',
];

const AnalysisPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as {
    serviceName?: string;
    imageCount?: number;
  } | null;

  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const files: File[] = (window as any).__pendingFiles || [];
    console.log('files:', files);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) { clearInterval(progressInterval); return 90; }
        return prev + 1;
      });
    }, 50);

    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= STEPS.length - 2) { clearInterval(stepInterval); return prev; }
        return prev + 1;
      });
    }, 800);

    analyzeImages(files, (current, total) => {
      console.log(`분석 중: ${current}/${total}`);
    })
      .then((report) => {
        report.serviceName = state?.serviceName || '분석 서비스';
        clearInterval(progressInterval);
        clearInterval(stepInterval);
        setProgress(100);
        setCurrentStep(STEPS.length - 1);
        setTimeout(() => {
          navigate(`/report/${report.id}`, { state: { report } });
        }, 500);
      })
      .catch((err) => {
        clearInterval(progressInterval);
        clearInterval(stepInterval);
        setError(err.message || '분석 중 오류가 발생했습니다.');
      });

    return () => {
      clearInterval(progressInterval);
      clearInterval(stepInterval);
    };
  }, [navigate, state]);

  const getStepStatus = (index: number) => {
    if (index < currentStep) return 'done';
    if (index === currentStep) return 'active';
    return 'waiting';
  };

  const currentLabel = progress >= 100 ? '완료!' : `${STEPS[currentStep]} 중...`;

  return (
    <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[70vh]">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        스크린샷을 분석하고 있습니다
      </h2>
      {state?.imageCount && (
        <p className="text-gray-500 mb-10">
          {state.imageCount}장의 화면에서 다크패턴을 탐지 중입니다
        </p>
      )}

      {error && (
        <div className="w-full bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-red-600 text-sm font-medium mb-2">분석 실패</p>
          <p className="text-red-500 text-sm">{error}</p>
          <button onClick={() => navigate('/')} className="mt-3 text-sm text-blue-600 hover:underline cursor-pointer">
            홈으로 돌아가기
          </button>
        </div>
      )}

      {!error && (
        <>
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

          <div className="w-full space-y-3">
            {STEPS.map((step, index) => {
              const status = getStepStatus(index);
              return (
                <div key={index} className="flex items-center gap-3">
                  {status === 'done' && (
                    <span className="w-5 h-5 flex items-center justify-center rounded-full bg-green-500">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  )}
                  {status === 'active' && (
                    <span className="w-5 h-5 flex items-center justify-center">
                      <span className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
                    </span>
                  )}
                  {status === 'waiting' && (
                    <span className="w-5 h-5 flex items-center justify-center">
                      <span className="w-3 h-3 bg-gray-300 rounded-full" />
                    </span>
                  )}
                  <span className={`text-sm ${
                    status === 'done' ? 'text-green-600' :
                    status === 'active' ? 'text-yellow-600 font-medium' : 'text-gray-400'
                  }`}>
                    {step}
                    {status === 'done' && ' 완료'}
                    {status === 'active' && ' 중...'}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {state?.serviceName && !error && (
        <p className="text-xs text-gray-400 mt-10">
          분석 대상: {state.serviceName}
        </p>
      )}
    </div>
  );
};

export default AnalysisPage;
