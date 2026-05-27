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
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

const HomePage = () => {
  const [serviceName, setServiceName] = useState('');
  const [images, setImages] = useState<PreviewImage[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

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

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const removeImage = (id: string) => {
    setImages((prev) => {
      const target = prev.find((img) => img.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((img) => img.id !== id);
    });
    setError('');
  };

  const updateLabel = (id: string, label: string) => {
    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, pageLabel: label } : img))
    );
  };

  const handleAnalyze = () => {
    if (images.length === 0) return;
    (window as any).__pendingFiles = images.map((img) => img.file);
    navigate('/analysis', {
      state: { serviceName, imageCount: images.length },
    });
  };

  return (
    <div className="max-w-3xl mx-auto">

      {/* 페이지 헤더 */}
      <div className="mb-8 pb-6" style={{ borderBottom: '2px solid var(--navy)' }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-2"
          style={{ color: 'var(--navy)' }}>
          AI 기반 UX 진단 시스템
        </p>
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text)' }}>
          AI UX 다크패턴 진단
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          UI 스크린샷을 업로드하면 다크패턴 유형, 위험도, 개선 방안을 자동 분석합니다.
        </p>
      </div>

      {/* 서비스명 입력 */}
      <div className="mb-5">
        <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text)' }}>
          진단 대상 서비스명
        </label>
        <input
          type="text"
          value={serviceName}
          onChange={(e) => setServiceName(e.target.value)}
          placeholder="예: 토스, 카카오뱅크, 삼성증권"
          className="w-full px-4 py-2.5 text-sm rounded focus:outline-none"
          style={{
            border: '1px solid var(--border)',
            backgroundColor: 'var(--surface)',
            color: 'var(--text)',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--navy)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
        />
      </div>

      {/* 업로드 영역 */}
      <div className="mb-5">
        <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text)' }}>
          스크린샷 업로드
        </label>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className="rounded-lg p-10 text-center transition-colors"
          style={{
            border: `2px dashed ${dragOver ? 'var(--navy)' : 'var(--border)'}`,
            backgroundColor: dragOver ? '#eef3fb' : 'var(--surface)',
          }}
        >
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded flex items-center justify-center"
              style={{ backgroundColor: '#e8eef8' }}>
              <svg className="w-6 h-6" style={{ color: 'var(--navy)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
          </div>
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
            이미지를 드래그하거나 클릭해 업로드
          </p>
          <p className="text-xs mb-5" style={{ color: 'var(--text-secondary)' }}>
            PNG · JPG · WEBP &nbsp;|&nbsp; 최대 {MAX_FILES}장 · 장당 10MB 이하
          </p>
          <label
            className="inline-block px-5 py-2 text-sm font-semibold rounded cursor-pointer transition-colors"
            style={{ backgroundColor: 'var(--navy)', color: 'white' }}
          >
            파일 선택
            <input type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden"
              onChange={(e) => addFiles(e.target.files)} />
          </label>
        </div>
        {error && (
          <p className="text-xs mt-2 flex items-center gap-1" style={{ color: 'var(--red)' }}>
            <span>⚠</span> {error}
          </p>
        )}
      </div>

      {/* 이미지 미리보기 */}
      {images.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            {images.map((img) => (
              <div key={img.id}
                className="relative flex-shrink-0 w-32 rounded-lg overflow-hidden"
                style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
                <button
                  onClick={() => removeImage(img.id)}
                  className="absolute top-1.5 right-1.5 w-5 h-5 text-white rounded-full text-xs flex items-center justify-center z-10"
                  style={{ backgroundColor: 'var(--red)' }}
                >✕</button>
                <img src={img.previewUrl} alt={img.file.name} className="w-full h-28 object-cover" />
                <div className="p-2">
                  <p className="text-xs truncate mb-1" style={{ color: 'var(--text-secondary)' }}>
                    {img.file.name}
                  </p>
                  <input
                    type="text"
                    value={img.pageLabel}
                    onChange={(e) => updateLabel(img.id, e.target.value)}
                    placeholder="페이지명"
                    className="w-full text-xs px-2 py-1 rounded focus:outline-none"
                    style={{ border: '1px solid var(--border)', color: 'var(--text)' }}
                  />
                </div>
              </div>
            ))}
            {images.length < MAX_FILES && (
              <label className="flex-shrink-0 w-32 h-[172px] rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors"
                style={{ border: '2px dashed var(--border)' }}>
                <span className="text-2xl mb-1" style={{ color: 'var(--text-secondary)' }}>+</span>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>추가</span>
                <input type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden"
                  onChange={(e) => addFiles(e.target.files)} />
              </label>
            )}
          </div>
        </div>
      )}

      {/* 요약 정보 */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-7">
          {[
            { label: '업로드된 화면', value: `${images.length}장` },
            { label: '진단 대상 앱', value: serviceName || '-' },
            { label: '예상 소요 시간', value: `약 ${Math.max(10, images.length * 10)}초` },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg p-4"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</p>
              <p className="text-xl font-bold truncate" style={{ color: 'var(--navy)' }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* 분석 버튼 */}
      <div className="flex justify-end">
        <Button size="lg" onClick={handleAnalyze} disabled={images.length === 0}>
          {images.length > 0 ? `${images.length}장 스크린샷 분석 시작 →` : '스크린샷을 업로드하세요'}
        </Button>
      </div>
    </div>
  );
};

export default HomePage;
