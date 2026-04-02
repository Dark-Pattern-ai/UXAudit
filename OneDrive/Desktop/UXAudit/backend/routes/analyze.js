const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const { buildReport } = require('../utils/reportBuilder');
const { extractText } = require('../utils/ocrEngine');
const { getMockAIResult } = require('../utils/mockAI');

const router = express.Router();
const AI_SERVER_URL = process.env.AI_SERVER_URL || 'http://localhost:8000';
const USE_MOCK = process.env.USE_MOCK_AI === 'true';

if (USE_MOCK) {
  console.log('⚠️  [MockAI 모드] 실제 AI 서버 대신 목 응답을 사용합니다.');
  console.log('   MOCK_CATEGORY 환경변수로 카테고리를 고정할 수 있어요.');
  console.log('   예) MOCK_CATEGORY=PRESSURING npm run dev\n');
}

// 메모리 버퍼로 이미지 수신 (디스크 저장 없음)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('JPG, PNG, WEBP 형식만 지원합니다.'));
    }
    cb(null, true);
  },
});

/**
 * POST /api/analyze
 * Body: multipart/form-data { image: File }
 * Response: { report: ReportObject }
 */
router.post('/analyze', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '이미지 파일이 필요합니다.' });
    }

    // USE_MOCK_AI=true 이면 실제 AI 서버 대신 목 응답 사용
    const aiCall = USE_MOCK
      ? Promise.resolve(getMockAIResult())
      : callAIServer(req.file);

    // AI 분류 & OCR 병렬 실행
    const [aiResult, ocrResult] = await Promise.all([
      aiCall,
      extractText(req.file.buffer),
    ]);

    const report = buildReport({ aiResult, ocrResult });
    res.json({ report });
  } catch (err) {
    next(err);
  }
});

/**
 * 실제 AI 서버 호출
 */
async function callAIServer(file) {
  const form = new FormData();
  form.append('image', file.buffer, {
    filename: file.originalname,
    contentType: file.mimetype,
  });

  try {
    const response = await axios.post(`${AI_SERVER_URL}/ai/analyze-image`, form, {
      headers: { ...form.getHeaders() },
      timeout: 30000,
    });
    return response.data;
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      throw Object.assign(new Error('AI 서버에 연결할 수 없습니다.'), { status: 503 });
    }
    if (err.response) {
      throw Object.assign(
        new Error(`AI 서버 오류: ${err.response.data?.detail || err.message}`),
        { status: 502 }
      );
    }
    throw err;
  }
}

module.exports = router;
