const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const patternTypes = [
  {
    id: 1,
    code: 'FSC_01',
    name: '설명절차의 과도한 축약',
    category: 'MISLEADING',
    description: '설명 절차나 확인 단계를 과도하게 줄여 소비자가 핵심 내용을 오인하도록 유도하는 유형',
    fscGuideline: '오도형 ① 설명절차의 과도한 축약',
    detectable: true,
  },
  {
    id: 2,
    code: 'FSC_02',
    name: '속임수 질문',
    category: 'MISLEADING',
    description: '사용자가 의도하지 않은 선택을 하도록 질문 문구를 혼동되게 구성하는 유형',
    fscGuideline: '오도형 ② 속임수 질문',
    detectable: true,
  },
  {
    id: 3,
    code: 'FSC_03',
    name: '잘못된 계층구조',
    category: 'MISLEADING',
    description: '사업자에게 유리한 선택지를 더 눈에 띄게 배치하여 사용자의 판단을 왜곡하는 유형',
    fscGuideline: '오도형 ③ 잘못된 계층구조',
    detectable: true,
  },
  {
    id: 4,
    code: 'FSC_04',
    name: '특정 옵션 사전선택',
    category: 'MISLEADING',
    description: '사용자에게 불리하거나 사업자에게 유리한 옵션을 기본 선택 상태로 제공하는 유형',
    fscGuideline: '오도형 ④ 특정 옵션 사전선택',
    detectable: true,
  },
  {
    id: 5,
    code: 'FSC_05',
    name: '허위광고 및 기만적 유인행위',
    category: 'MISLEADING',
    description: '혜택, 조건, 가격 등을 실제보다 유리하게 보이도록 표현하여 사용자를 유인하는 유형',
    fscGuideline: '오도형 ⑤ 허위광고 및 기만적 유인행위',
    detectable: true,
  },
  {
    id: 6,
    code: 'FSC_06',
    name: '취소·해지·탈퇴 방해',
    category: 'OBSTRUCTING',
    description: '취소, 해지, 탈퇴 절차를 복잡하게 만들거나 찾기 어렵게 배치하는 유형',
    fscGuideline: '방해형 ⑥ 취소·해지·탈퇴 방해',
    detectable: true,
  },
  {
    id: 7,
    code: 'FSC_07',
    name: '숨겨진 정보 제공',
    category: 'OBSTRUCTING',
    description: '중요한 조건이나 불리한 정보를 작은 글씨, 낮은 대비, 하위 화면 등에 숨기는 유형',
    fscGuideline: '방해형 ⑦ 숨겨진 정보 제공',
    detectable: true,
  },
  {
    id: 8,
    code: 'FSC_08',
    name: '가격비교 방해',
    category: 'OBSTRUCTING',
    description: '가격, 수수료, 조건 비교를 어렵게 만들어 합리적 판단을 방해하는 유형',
    fscGuideline: '방해형 ⑧ 가격비교 방해',
    detectable: true,
  },
  {
    id: 9,
    code: 'FSC_09',
    name: '클릭 피로감 유발',
    category: 'OBSTRUCTING',
    description: '불필요한 클릭이나 반복 확인 절차를 유도하여 사용자의 권리 행사를 어렵게 하는 유형',
    fscGuideline: '방해형 ⑨ 클릭 피로감 유발',
    detectable: true,
  },
  {
    id: 10,
    code: 'FSC_10',
    name: '계약과정 중 기습적 광고',
    category: 'PRESSURING',
    description: '계약 또는 가입 과정 중 예상치 못한 광고, 추천, 추가 가입 유도를 삽입하는 유형',
    fscGuideline: '압박형 ⑩ 계약과정 중 기습적 광고',
    detectable: true,
  },
  {
    id: 11,
    code: 'FSC_11',
    name: '반복 간섭',
    category: 'PRESSURING',
    description: '사용자가 거절하거나 닫은 뒤에도 반복적으로 선택을 유도하는 유형',
    fscGuideline: '압박형 ⑪ 반복 간섭',
    detectable: true,
  },
  {
    id: 12,
    code: 'FSC_12',
    name: '감정적 언어 사용',
    category: 'PRESSURING',
    description: '불안, 손해, 후회, 긴박감 등을 자극하는 문구로 사용자의 판단을 압박하는 유형',
    fscGuideline: '압박형 ⑫ 감정적 언어 사용',
    detectable: true,
  },
  {
    id: 13,
    code: 'FSC_13',
    name: '감각 조작',
    category: 'PRESSURING',
    description: '색상, 크기, 대비, 애니메이션 등 시각적 요소로 특정 선택을 과도하게 유도하는 유형',
    fscGuideline: '압박형 ⑬ 감각 조작',
    detectable: true,
  },
  {
    id: 14,
    code: 'FSC_14',
    name: '다른 소비자의 활동 알림',
    category: 'PRESSURING',
    description: '다른 사용자의 구매, 가입, 조회 등 활동을 보여주며 사용자의 즉각적 행동을 압박하는 유형',
    fscGuideline: '압박형 ⑭ 다른 소비자의 활동 알림',
    detectable: true,
  },
  {
    id: 15,
    code: 'FSC_15',
    name: '순차공개 가격책정',
    category: 'EXPLOITING',
    description: '초기 화면에서는 일부 가격만 보여주고 이후 단계에서 수수료나 추가 비용을 공개하는 유형',
    fscGuideline: '편취유도형 ⑮ 순차공개 가격책정',
    detectable: true,
  },
];

async function main() {
  for (const patternType of patternTypes) {
    await prisma.patternType.upsert({
      where: { id: patternType.id },
      update: patternType,
      create: patternType,
    });
  }

  console.log(`Seeded ${patternTypes.length} pattern types.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });