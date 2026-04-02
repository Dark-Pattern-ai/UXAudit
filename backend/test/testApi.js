/**
 * testApi.js — UXAudit 백엔드 API 자동 테스트
 *
 * 실행 방법:
 *   터미널 1: npm run dev:mock
 *   터미널 2: npm run test:api
 */

const axios = require('axios');
const FormData = require('form-data');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const ENDPOINT = `${BASE_URL}/api/analyze`;

// 테스트용 최소 PNG (1x1 픽셀)
const TINY_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==';
const TINY_PNG_BUF = Buffer.from(TINY_PNG_B64, 'base64');

let passed = 0;
let failed = 0;

function ok(name)         { console.log(`  ✅ PASS  ${name}`); passed++; }
function fail(name, msg)  { console.log(`  ❌ FAIL  ${name}\n         → ${msg}`); failed++; }

async function run(name, fn) {
  try { await fn(); }
  catch (e) { fail(name, e.message); }
}

// ─────────────────────────────────────────────
// 프론트 스펙 기준 필드 검사
// ─────────────────────────────────────────────
const REQUIRED_FIELDS = [
  'category',
  'categoryLabel',
  'overallRiskScore',       // 구: riskScore
  'riskLevel',
  'summary',                // 신규
  'totalDetected',          // 신규
  'detectedPatterns',       // 구: ocrPatterns
  'guidelineCompliance',    // 구: guidelineRef (배열)
  'suggestions',
  'ocr',
  'confidence',
  'analyzedAt',
];

function assertReportShape(report) {
  // 필수 필드 존재 확인
  for (const field of REQUIRED_FIELDS) {
    if (report[field] === undefined) throw new Error(`'${field}' 필드 없음`);
  }

  // 타입 및 범위 확인
  if (typeof report.overallRiskScore !== 'number' || report.overallRiskScore < 0 || report.overallRiskScore > 100)
    throw new Error(`overallRiskScore 범위 오류: ${report.overallRiskScore}`);

  const validLevels = ['SAFE', 'MEDIUM', 'HIGH', 'CRITICAL'];
  if (!validLevels.includes(report.riskLevel))
    throw new Error(`riskLevel 값 오류: ${report.riskLevel}`);

  const validCategories = ['NORMAL', 'MISLEADING', 'OBSTRUCTING', 'PRESSURING', 'EXPLOITING'];
  if (!validCategories.includes(report.category))
    throw new Error(`category 값 오류: ${report.category}`);

  // 프론트 CATEGORY_CONFIG label 일치 확인
  const validLabels = ['정상', '오도형', '방해형', '압박형', '편취유도형'];
  if (!validLabels.includes(report.categoryLabel))
    throw new Error(`categoryLabel 값 오류: ${report.categoryLabel}`);

  if (!Array.isArray(report.detectedPatterns))
    throw new Error('detectedPatterns가 배열이 아님');

  if (!Array.isArray(report.guidelineCompliance))
    throw new Error('guidelineCompliance가 배열이 아님');

  // guidelineCompliance 구조 확인
  for (const g of report.guidelineCompliance) {
    if (typeof g.isCompliant !== 'boolean')
      throw new Error(`guidelineCompliance.isCompliant가 boolean이 아님`);
    if (!g.category || !g.details)
      throw new Error(`guidelineCompliance 필드 누락`);
  }

  if (typeof report.totalDetected !== 'number')
    throw new Error('totalDetected가 숫자가 아님');

  if (report.totalDetected !== report.detectedPatterns.length)
    throw new Error(`totalDetected(${report.totalDetected}) ≠ detectedPatterns.length(${report.detectedPatterns.length})`);
}

// ─────────────────────────────────────────────
// 테스트 케이스
// ─────────────────────────────────────────────

async function test_health() {
  const name = 'TC-01 | /health 응답 확인';
  await run(name, async () => {
    const res = await axios.get(`${BASE_URL}/health`);
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    ok(name);
  });
}

async function test_normalRequest() {
  const name = 'TC-02 | 정상 요청 — 프론트 스펙 필드 전체 확인';
  await run(name, async () => {
    const form = new FormData();
    form.append('image', TINY_PNG_BUF, { filename: 'test.png', contentType: 'image/png' });

    const res = await axios.post(ENDPOINT, form, { headers: form.getHeaders() });
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    if (!res.data.report) throw new Error('report 필드 없음');

    assertReportShape(res.data.report);
    ok(name);

    const r = res.data.report;
    console.log(`         category=${r.category}  categoryLabel=${r.categoryLabel}`);
    console.log(`         overallRiskScore=${r.overallRiskScore}  riskLevel=${r.riskLevel}`);
    console.log(`         totalDetected=${r.totalDetected}  detectedPatterns=${r.detectedPatterns.length}개`);
    console.log(`         guidelineCompliance=${r.guidelineCompliance.length}개 항목`);
  });
}

async function test_noFile() {
  const name = 'TC-03 | 파일 없음 → 400';
  await run(name, async () => {
    try {
      await axios.post(ENDPOINT, {}, { headers: { 'Content-Type': 'application/json' } });
      throw new Error('400이 반환되어야 함');
    } catch (err) {
      if (err.response?.status === 400) ok(name);
      else throw new Error(`예상 400, 실제 ${err.response?.status ?? err.message}`);
    }
  });
}

async function test_wrongMimeType() {
  const name = 'TC-04 | 잘못된 형식(PDF) → 400';
  await run(name, async () => {
    const form = new FormData();
    form.append('image', Buffer.from('%PDF-1.4'), { filename: 'doc.pdf', contentType: 'application/pdf' });
    try {
      await axios.post(ENDPOINT, form, { headers: form.getHeaders() });
      throw new Error('400이 반환되어야 함');
    } catch (err) {
      if (err.response?.status === 400) ok(name);
      else throw new Error(`예상 400, 실제 ${err.response?.status ?? err.message}`);
    }
  });
}

async function test_fileTooLarge() {
  const name = 'TC-05 | 파일 크기 초과(11MB) → 400';
  await run(name, async () => {
    const form = new FormData();
    form.append('image', Buffer.alloc(11 * 1024 * 1024), { filename: 'big.png', contentType: 'image/png' });
    try {
      await axios.post(ENDPOINT, form, { headers: form.getHeaders() });
      throw new Error('400이 반환되어야 함');
    } catch (err) {
      if (err.response?.status === 400) ok(name);
      else throw new Error(`예상 400, 실제 ${err.response?.status ?? err.message}`);
    }
  });
}

async function test_allCategories() {
  const categories = ['NORMAL', 'MISLEADING', 'OBSTRUCTING', 'PRESSURING', 'EXPLOITING'];
  const expectedLabels = {
    NORMAL: '정상', MISLEADING: '오도형', OBSTRUCTING: '방해형',
    PRESSURING: '압박형', EXPLOITING: '편취유도형',
  };

  console.log('\n  [Mock 라운드로빈] 5개 카테고리 순환 확인...');

  for (let i = 0; i < categories.length; i++) {
    const expected = categories[i];
    const name = `TC-06-${i + 1} | Mock 카테고리 ${expected} (label: ${expectedLabels[expected]})`;
    await run(name, async () => {
      const form = new FormData();
      form.append('image', TINY_PNG_BUF, { filename: 'test.png', contentType: 'image/png' });

      const res = await axios.post(ENDPOINT, form, { headers: form.getHeaders() });
      const report = res.data.report;

      assertReportShape(report);

      if (report.category !== expected)
        throw new Error(`category 불일치: 예상=${expected}, 실제=${report.category}`);

      if (report.categoryLabel !== expectedLabels[expected])
        throw new Error(`categoryLabel 불일치: 예상=${expectedLabels[expected]}, 실제=${report.categoryLabel}`);

      ok(name);
      console.log(`         overallRiskScore=${report.overallRiskScore}  totalDetected=${report.totalDetected}  summary="${report.summary.slice(0, 30)}..."`);
    });
  }
}

// ─────────────────────────────────────────────
// 실행
// ─────────────────────────────────────────────
(async () => {
  console.log('='.repeat(60));
  console.log('  UXAudit 백엔드 API 테스트 (프론트 스펙 기준)');
  console.log(`  대상: ${ENDPOINT}`);
  console.log('='.repeat(60));
  console.log();

  try {
    await axios.get(`${BASE_URL}/health`, { timeout: 3000 });
  } catch {
    console.error('❌ 서버 연결 불가. 먼저 실행하세요: npm run dev:mock');
    process.exit(1);
  }

  await test_health();
  console.log();
  await test_normalRequest();
  console.log();
  await test_noFile();
  await test_wrongMimeType();
  await test_fileTooLarge();
  await test_allCategories();

  console.log();
  console.log('='.repeat(60));
  console.log(`  결과: ${passed}개 통과 / ${failed}개 실패`);
  console.log('='.repeat(60));
  process.exit(failed > 0 ? 1 : 0);
})();