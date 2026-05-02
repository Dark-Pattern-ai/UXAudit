import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/common/Button';

interface PreviewImage {
  id: string;
  file: File;
  previewUrl: string;
  pageLabel: string;
}

const MAX_FILES = 20;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

const HomePage = () => {
  const [serviceName, setServiceName] = useState('');
  const [images, setImages] = useState<PreviewImage[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // 파일 검증 및 추가
  const addFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      setError('');

      const remaining = MAX_FILES - images.length;
      if (remaining <= 0) {
        setError(`최대 ${MAX_FILES}장까지 업로드 가능합니다.`);
        return;
      }

      const validFiles: File[] = [];
      Array.from(files).forEach((file) => {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          setError('PNG, JPG, WEBP 파일만 업로드 가능합니다.');
          return;
        }
        if (file.size > MAX_FILE_SIZE) {
          setError('장당 10MB 이하 파일만 업로드 가능합니다.');
          return;
        }
        validFiles.push(file);
      });

      const filesToAdd = validFiles.slice(0, remaining);
      const newImages: PreviewImage[] = filesToAdd.map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        pageLabel: '',
      }));

      setImages((prev) => [...prev, ...newImages]);
    },
    [images.length]
  );

  // 드래그 앤 드롭
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  // 이미지 삭제
  const removeImage = (id: string) => {
    setImages((prev) => {
      const target = prev.find((img) => img.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((img) => img.id !== id);
    });
    setError('');
  };

  // 페이지 라벨 수정
  const updateLabel = (id: string, label: string) => {
    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, pageLabel: label } : img))
    );
  };

  // 분석 시작
  const handleAnalyze = () => {
    if (images.length === 0) return;
    navigate('/analysis', {
      state: { serviceName, imageCount: images.length },
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* 타이틀 */}
      <div className="text-center mb-10 mt-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">
          AI 금융 UX 다크패턴 진단
        </h1>
        <p className="text-gray-500 max-w-xl mx-auto">
          금융 앱 스크린샷을 업로드하면 AI가 다크패턴을 자동으로 탐지하고,
          금융위원회 가이드라인 기준에 따른 진단 리포트를 제공합니다.
        </p>
      </div>

      {/* 서비스명 입력 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          진단 대상 서비스명
        </label>
        <input
          type="text"
          value={serviceName}
          onChange={(e) => setServiceName(e.target.value)}
          placeholder="예: 토스, 카카오뱅크, 삼성증권 등"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-blue-500
                     text-gray-900 placeholder-gray-400"
        />
      </div>

      {/* 이미지 업로드 영역 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          스크린샷 업로드
        </label>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors
            ${
              dragOver
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 bg-white hover:border-gray-400'
            }`}
        >
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
          </div>
          <p className="text-gray-600 font-medium mb-1">
            금융 앱 스크린샷을 드래그하거나 클릭해 업로드
          </p>
          <p className="text-xs text-gray-400 mb-4">
            PNG · JPG · 최대 {MAX_FILES}장 · 장당 10MB 이하
          </p>
          <label
            className="inline-block px-5 py-2.5 bg-blue-600 text-white rounded-lg
                       cursor-pointer hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            파일 선택
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
          </label>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <p className="text-sm text-red-500 mt-2">{error}</p>
        )}
      </div>

      {/* 업로드된 이미지 카드 */}
      {images.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-4 overflow-x-auto pb-2">
            {images.map((img) => (
              <div
                key={img.id}
                className="relative flex-shrink-0 w-32 border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm"
              >
                {/* 삭제 버튼 */}
                <button
                  onClick={() => removeImage(img.id)}
                  className="absolute top-1.5 right-1.5 w-5 h-5 bg-red-500 text-white
                             rounded-full text-xs flex items-center justify-center
                             hover:bg-red-600 transition-colors cursor-pointer z-10"
                >
                  ✕
                </button>

                {/* 이미지 미리보기 */}
                <img
                  src={img.previewUrl}
                  alt={img.file.name}
                  className="w-full h-28 object-cover"
                />

                {/* 파일명 + 라벨 */}
                <div className="p-2">
                  <p className="text-xs text-gray-400 truncate mb-1">{img.file.name}</p>
                  <input
                    type="text"
                    value={img.pageLabel}
                    onChange={(e) => updateLabel(img.id, e.target.value)}
                    placeholder="페이지명"
                    className="w-full text-xs px-2 py-1 border border-gray-200 rounded
                               focus:outline-none focus:ring-1 focus:ring-blue-500
                               text-gray-700 placeholder-gray-400"
                  />
                </div>
              </div>
            ))}

            {/* 추가 버튼 */}
            {images.length < MAX_FILES && (
              <label
                className="flex-shrink-0 w-32 h-[172px] border-2 border-dashed border-gray-300
                           rounded-xl flex flex-col items-center justify-center cursor-pointer
                           hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <span className="text-2xl text-gray-400 mb-1">+</span>
                <span className="text-xs text-gray-400">추가</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => addFiles(e.target.files)}
                />
              </label>
            )}
          </div>
        </div>
      )}

      {/* 하단 요약 바 */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">업로드된 화면</p>
            <p className="text-2xl font-bold text-gray-900">{images.length}장</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">진단 대상 앱</p>
            <p className="text-2xl font-bold text-gray-900 truncate">
              {serviceName || '-'}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">예상 소요 시간</p>
            <p className="text-2xl font-bold text-gray-900">
              약 {Math.max(10, images.length * 10)}초
            </p>
          </div>
        </div>
      )}

      {/* 분석 시작 버튼 */}
      <div className="text-center">
        <Button size="lg" onClick={handleAnalyze} disabled={images.length === 0}>
          {images.length > 0
            ? `${images.length}장 스크린샷 분석 시작`
            : '스크린샷을 업로드하세요'}
        </Button>
      </div>
    </div>
  );
};

export default HomePage;
