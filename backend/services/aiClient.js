const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const AI_SERVER_URL = process.env.AI_SERVER_URL || 'http://localhost:8000';

function getContentType(imagePath) {
  const ext = path.extname(imagePath).toLowerCase();

  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';

  return 'application/octet-stream';
}

async function analyzeImageWithAI(imagePath) {
  const form = new FormData();

  form.append('image', fs.createReadStream(imagePath), {
    filename: path.basename(imagePath),
    contentType: getContentType(imagePath),
  });

  try {
    // 임시 테스트: AI 서버 OCR endpoint 호출
    const response = await axios.post(`${AI_SERVER_URL}/ai/ocr`, form, {
      headers: form.getHeaders(),
      timeout: 180000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    const ocr = response.data;

    // reportService가 기대하는 표준 aiResult 형태로 감싸기
    return {
      category: 'NORMAL',
      risk_score: 0,
      confidence: ocr.confidence || 0,
      summary: 'OCR 테스트가 완료되었습니다.',
      suggestions: [],
      ocr,
      detectedPatterns: [],
      featureVector: null,
    };
  } catch (error) {
    const status = error.response?.status;
    const data = error.response?.data;

    const message = status
      ? `AI 서버 호출 실패: ${status} ${JSON.stringify(data)}`
      : `AI 서버 호출 실패: ${error.message}`;

    throw new Error(message);
  }
}

module.exports = {
  analyzeImageWithAI,
};