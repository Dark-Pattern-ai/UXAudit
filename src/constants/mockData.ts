import type { DiagnosisReport } from '../types';

// 리포트 1: 위험도 높음 (다크패턴 다수)
export const mockReport1: DiagnosisReport = {
  id: 'rpt-001',
  serviceName: '예시 금융앱',
  analyzedAt: '2026-03-27T10:30:00Z',
  overallRiskScore: 78,
  totalDetected: 5,
  summary:
    '해당 금융 서비스에서 총 5건의 다크패턴이 탐지되었습니다. 특히 방해형과 압박형 패턴이 집중적으로 발견되어 즉각적인 UX 개선이 필요합니다.',
  uploadedImages: [
    { id: 'img-1', fileName: '카드_메인.png', url: '', pageLabel: '메인 화면' },
    { id: 'img-2', fileName: '보험_가입.png', url: '', pageLabel: '보험 가입 페이지' },
    { id: 'img-3', fileName: '대출_신청.png', url: '', pageLabel: '대출 신청 페이지' },
  ],
  detectedPatterns: [
    {
      id: 1,
      category: 'OBSTRUCTING',
      patternName: '취소·해지·탈퇴 방해',
      riskLevel: 'HIGH',
      description:
        '해지 버튼이 설정 > 계정관리 > 서비스 > 구독해지 등 4단계 하위 메뉴에 위치하며, 버튼 색상이 배경과 유사하여 시인성이 낮음',
      recommendation:
        '해지 버튼을 메인 설정 화면에 배치하고, 명확한 색상 대비를 적용하세요.',
      location: '설정 > 계정관리 > 서비스 > 구독해지',
    },
    {
      id: 2,
      category: 'PRESSURING',
      patternName: '감정적 언어 사용',
      riskLevel: 'MEDIUM',
      description:
        '"정말 혜택을 포기하시겠습니까?", "해지하면 돌이킬 수 없습니다" 등 감정적 문구를 사용하여 해지를 망설이게 함',
      recommendation:
        '"구독을 해지합니다", "해지 완료" 등 중립적 표현으로 변경하세요.',
      location: '구독 해지 확인 팝업',
    },
    {
      id: 3,
      category: 'MISLEADING',
      patternName: '특정 옵션 사전선택',
      riskLevel: 'HIGH',
      description:
        '금융상품 가입 시 "마케팅 정보 수신 동의"와 "자동 갱신"이 기본 체크되어 있음',
      recommendation:
        '모든 선택적 동의 항목의 기본값을 해제 상태로 변경하세요.',
      location: '상품 가입 페이지 > 동의 항목',
    },
    {
      id: 4,
      category: 'PRESSURING',
      patternName: '반복 간섭',
      riskLevel: 'MEDIUM',
      description:
        '해지 의사를 표시한 후에도 3회에 걸쳐 "정말 해지하시겠습니까?" 확인 팝업이 반복 노출됨',
      recommendation:
        '해지 확인은 1회로 제한하고, 간결한 확인 절차를 제공하세요.',
      location: '구독 해지 프로세스',
    },
    {
      id: 5,
      category: 'EXPLOITING',
      patternName: '순차공개 가격책정',
      riskLevel: 'HIGH',
      description:
        '월 이용료만 표시하고 가입 마지막 단계에서 계좌 관리 수수료, 플랫폼 이용료 등 추가 비용이 공개됨',
      recommendation:
        '모든 비용 항목을 상품 소개 초기 단계에서 명확하게 고지하세요.',
      location: '상품 가입 최종 확인 페이지',
    },
  ],
  guidelineCompliance: [
    { category: 'MISLEADING', isCompliant: false, details: '특정 옵션 사전선택 위반 발견' },
    { category: 'OBSTRUCTING', isCompliant: false, details: '취소·해지 방해 위반 발견' },
    { category: 'PRESSURING', isCompliant: false, details: '감정적 언어, 반복 간섭 위반 발견' },
    { category: 'EXPLOITING', isCompliant: false, details: '순차공개 가격책정 위반 발견' },
  ],
};

// 리포트 2: 위험도 중간 (일부 다크패턴)
export const mockReport2: DiagnosisReport = {
  id: 'rpt-002',
  serviceName: '머니트리 증권',
  analyzedAt: '2026-03-26T15:00:00Z',
  overallRiskScore: 38,
  totalDetected: 2,
  summary:
    '2건의 다크패턴이 탐지되었습니다. 오도형 패턴이 발견되었으나 전반적인 위험도는 중간 수준입니다.',
  uploadedImages: [
    { id: 'img-4', fileName: '증권_메인.png', url: '', pageLabel: '메인 화면' },
    { id: 'img-5', fileName: '증권_계좌개설.png', url: '', pageLabel: '계좌 개설' },
  ],
  detectedPatterns: [
    {
      id: 1,
      category: 'MISLEADING',
      patternName: '설명절차의 과도한 축약',
      riskLevel: 'MEDIUM',
      description:
        '투자 위험 고지 화면이 한 줄 요약으로 축소되어 있고, "자세히 보기"를 눌러야 전체 내용을 확인할 수 있음',
      recommendation:
        '투자 위험 고지는 축소 없이 전체 내용을 기본 노출하세요.',
      location: '계좌 개설 > 투자 위험 고지',
    },
    {
      id: 2,
      category: 'MISLEADING',
      patternName: '잘못된 계층구조',
      riskLevel: 'LOW',
      description:
        '"동의하고 계속" 버튼이 "약관 전체보기" 버튼보다 3배 크게 표시되어 약관 확인을 건너뛰도록 유도',
      recommendation:
        '약관 확인 버튼과 동의 버튼의 크기를 동일하게 조정하세요.',
      location: '계좌 개설 > 약관 동의',
    },
  ],
  guidelineCompliance: [
    { category: 'MISLEADING', isCompliant: false, details: '설명절차 축약, 잘못된 계층구조 발견' },
    { category: 'OBSTRUCTING', isCompliant: true, details: '위반 사항 없음' },
    { category: 'PRESSURING', isCompliant: true, details: '위반 사항 없음' },
    { category: 'EXPLOITING', isCompliant: true, details: '위반 사항 없음' },
  ],
};

// 리포트 3: 위험도 낮음 (거의 문제 없음)
export const mockReport3: DiagnosisReport = {
  id: 'rpt-003',
  serviceName: '클린뱅크',
  analyzedAt: '2026-03-25T09:15:00Z',
  overallRiskScore: 12,
  totalDetected: 1,
  summary:
    '1건의 경미한 다크패턴이 탐지되었습니다. 전반적으로 금융위 가이드라인을 잘 준수하고 있습니다.',
  uploadedImages: [
    { id: 'img-6', fileName: '뱅킹_메인.png', url: '', pageLabel: '메인 화면' },
    { id: 'img-7', fileName: '뱅킹_송금.png', url: '', pageLabel: '송금 화면' },
    { id: 'img-8', fileName: '뱅킹_설정.png', url: '', pageLabel: '설정 화면' },
    { id: 'img-9', fileName: '뱅킹_해지.png', url: '', pageLabel: '해지 화면' },
  ],
  detectedPatterns: [
    {
      id: 1,
      category: 'PRESSURING',
      patternName: '다른 소비자의 활동 알림',
      riskLevel: 'LOW',
      description:
        '"지금 1,523명이 이 적금에 가입 중입니다" 문구가 상품 가입 페이지에 표시됨',
      recommendation:
        '다른 소비자의 활동을 보여주는 문구를 제거하거나, 상품 정보와 분리하여 배치하세요.',
      location: '적금 가입 페이지',
    },
  ],
  guidelineCompliance: [
    { category: 'MISLEADING', isCompliant: true, details: '위반 사항 없음' },
    { category: 'OBSTRUCTING', isCompliant: true, details: '위반 사항 없음' },
    { category: 'PRESSURING', isCompliant: false, details: '다른 소비자의 활동 알림 발견' },
    { category: 'EXPLOITING', isCompliant: true, details: '위반 사항 없음' },
  ],
};

// 전체 리포트 목록
export const mockReports: DiagnosisReport[] = [mockReport1, mockReport2, mockReport3];

// ID로 리포트 조회
export const getReportById = (id: string): DiagnosisReport | undefined => {
  return mockReports.find((report) => report.id === id);
};
