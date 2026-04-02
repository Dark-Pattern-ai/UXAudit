/**
 * testApi.js
 *
 * 역할: 백엔드 /api/analyze 엔드포인트를 자동으로 테스트한다.
 *
 * 테스트 케이스:
 *   1. 정상 요청  — 실제 이미지 파일 전송
 *   2. 파일 없음  — 400 에러 확인
 *   3. 잘못된 형식 — PDF 전송 → 400 에러 확인
 *   4. 파일 크기 초과 — 11MB 더미 데이터 → 400 에러 확인
 *   5. 카테고리 순환 — 5가지 Mock 카테고리 전부 응답 구조 확인
 *
 * 실행 방법:
 *   # 1) 백엔드를 Mock 모드로 실행 (터미널 1)
 *   USE_MOCK_AI=true npm run dev
 *
 *   # 2) 테스트 실행 (터미널 2)
 *   node test/testApi.js
 *
 * 의존성: axios, form-data (이미 package.json에 있음)
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const ENDPOINT = `${BASE_URL}/api/analyze`;

// ─────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────

// 테스트용 최소 PNG (1x1 빨간 픽셀)
// 실제 이미지 파일이 없어도 테스트 가능하도록 Base64 인라인 포함
const TINY_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==';
const TINY_PNG_BUF = Buffer.from(TINY_PNG_B64, 'base64');

let passed = 0;
let failed = 0;

function ok(name) {
  console.log(`  ✅ PASS  ${name}`);
  passed++;
}

function fail(name, reason) {
  console.log(`  ❌ FAIL  ${name}`);
  console.log(`         → ${reason}`);
  failed++;
}

async function run(name, fn) {
  try {
    await fn();
  } catch (e) {
    fail(name, e.message);
  }
}

// ─────────────────────────────────────────────
// 공통 응답 구조 검사
// 프론트엔드가 기대하는 필드를 모두 확인한다.
// ─────────────────────────────────────────────
const REQUIRED_REPORT_FIELDS = [
  'category',
  'categoryLabel',
  'riskScore',
  'riskLevel',
  'message',
  'patterns',
  'ocrPatterns',
  'crossPatterns',
  'suggestions',
  'ocr',
  'confidence',
  'analyzedAt',
];

function assertReportShape(report, testName) {
  for (const field of REQUIRED_REPORT_FIELDS) {
    if (report[field] === undefined) {
      throw new Error(`리포트에 '${field}' 필드가 없습니다.`);
    }
  }

  if (typeof report.riskScore !== 'number' || report.riskScore < 0 || report.riskScore > 100) {
    throw new Error(`riskScore 범위 오류: ${report.riskScore}`);
  }

  const validLevels = ['SAFE', 'MEDIUM', 'HIGH', 'CRITICAL'];
  if (!validLevels.includes(report.riskLevel)) {
    throw new Error(`riskLevel 값 오류: ${report.riskLevel}`);
  }

  const validCategories = ['NORMAL', 'MISLEADING', 'OBSTRUCTING', 'PRESSURING', 'EXPLOITING'];
  if (!validCategories.includes(report.category)) {
    throw new Error(`category 값 오류: ${report.category}`);
  }

  if (!Array.isArray(report.patterns)) throw new Error('patterns가 배열이 아닙니다.');
  if (!Array.isArray(report.ocrPatterns)) throw new Error('ocrPatterns가 배열이 아닙니다.');
  if (!Array.isArray(report.crossPatterns)) throw new Error('crossPatterns가 배열이 아닙니다.');
  if (!Array.isArray(report.suggestions)) throw new Error('suggestions가 배열이 아닙니다.');

  if (typeof report.ocr !== 'object' || report.ocr === null) {
    throw new Error('ocr 필드가 객체가 아닙니다.');
  }
}

// ─────────────────────────────────────────────
// 테스트 케이스
// ─────────────────────────────────────────────

async function test1_normalRequest() {
  const name = 'TC-01 | 정상 요청 (PNG 이미지)';
  await run(name, async () => {
    const form = new FormData();
    form.append('image', TINY_PNG_BUF, { filename: 'test.png', contentType: 'image/png' });

    const res = await axios.post(ENDPOINT, form, { headers: form.getHeaders() });

    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    if (!res.data.report) throw new Error('응답에 report 필드가 없습니다.');

    assertReportShape(res.data.report, name);
    ok(name);
    console.log(`         category=${res.data.report.category}  riskScore=${res.data.report.riskScore}  riskLevel=${res.data.report.riskLevel}`);
  });
}

async function test2_noFile() {
  const name = 'TC-02 | 파일 없음 → 400';
  await run(name, async () => {
    try {
      await axios.post(ENDPOINT, {}, { headers: { 'Content-Type': 'application/json' } });
      fail(name, '400이 반환되어야 하는데 성공했습니다.');
    } catch (err) {
      if (err.response?.status === 400) {
        ok(name);
      } else {
        throw new Error(`예상 400, 실제 ${err.response?.status ?? err.message}`);
      }
    }
  });
}

async function test3_wrongMimeType() {
  const name = 'TC-03 | 잘못된 파일 형식(PDF) → 400';
  await run(name, async () => {
    const fakePdf = Buffer.from('%PDF-1.4 fake content');
    const form = new FormData();
    form.append('image', fakePdf, { filename: 'doc.pdf', contentType: 'application/pdf' });

    try {
      await axios.post(ENDPOINT, form, { headers: form.getHeaders() });
      fail(name, '400이 반환되어야 하는데 성공했습니다.');
    } catch (err) {
      if (err.response?.status === 400) {
        ok(name);
      } else {
        throw new Error(`예상 400, 실제 ${err.response?.status ?? err.message}`);
      }
    }
  });
}

async function test4_fileTooLarge() {
  const name = 'TC-04 | 파일 크기 초과(11MB) → 400';
  await run(name, async () => {
    const bigBuffer = Buffer.alloc(11 * 1024 * 1024, 0); // 11MB 0-filled
    const form = new FormData();
    form.append('image', bigBuffer, { filename: 'big.png', contentType: 'image/png' });

    try {
      await axios.post(ENDPOINT, form, { headers: form.getHeaders() });
      fail(name, '400이 반환되어야 하는데 성공했습니다.');
    } catch (err) {
      if (err.response?.status === 400) {
        ok(name);
      } else {
        throw new Error(`예상 400, 실제 ${err.response?.status ?? err.message}`);
      }
    }
  });
}

async function test5_allCategories() {
  const categories = ['NORMAL', 'MISLEADING', 'OBSTRUCTING', 'PRESSURING', 'EXPLOITING'];

  console.log('\n  [Mock 라운드로빈] 5개 카테고리 순환 확인...');

  for (let i = 0; i < categories.length; i++) {
    const expected = categories[i];
    const name = `TC-05-${i + 1} | Mock 카테고리 ${expected}`;
    await run(name, async () => {
      const form = new FormData();
      form.append('image', TINY_PNG_BUF, { filename: 'test.png', contentType: 'image/png' });

      const res = await axios.post(ENDPOINT, form, { headers: form.getHeaders() });
      const report = res.data.report;

      assertReportShape(report, name);

      if (report.category !== expected) {
        throw new Error(`카테고리 불일치: 예상=${expected}, 실제=${report.category}`);
      }
      ok(name);
      console.log(`         riskScore=${report.riskScore}  riskLevel=${report.riskLevel}  ocrPatterns=${report.ocrPatterns.length}개`);
    });
  }
}

async function test6_healthCheck() {
  const name = 'TC-06 | /health 응답 확인';
  await run(name, async () => {
    const res = await axios.get(`${BASE_URL}/health`);
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    if (!res.data.status) throw new Error('status 필드 없음');
    ok(name);
  });
}

// ─────────────────────────────────────────────
// 실행
// ─────────────────────────────────────────────

(async () => {
  console.log('='.repeat(55));
  console.log('  UXAudit 백엔드 API 테스트');
  console.log(`  대상: ${ENDPOINT}`);
  console.log('='.repeat(55));
  console.log();

  // 서버 연결 확인
  try {
    await axios.get(`${BASE_URL}/health`, { timeout: 3000 });
  } catch {
    console.error('❌ 서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인하세요.');
    console.error(`   USE_MOCK_AI=true npm run dev`);
    process.exit(1);
  }

  await test6_healthCheck();
  console.log();
  await test1_normalRequest();
  console.log();
  await test2_noFile();
  await test3_wrongMimeType();
  await test4_fileTooLarge();
  await test5_allCategories();

  console.log();
  console.log('='.repeat(55));
  console.log(`  결과: ${passed}개 통과 / ${failed}개 실패`);
  console.log('='.repeat(55));

  process.exit(failed > 0 ? 1 : 0);
})();