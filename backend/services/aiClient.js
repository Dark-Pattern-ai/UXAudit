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
  const buffer = fs.readFileSync(imagePath);
  const filename = path.basename(imagePath);
  const contentType = getContentType(imagePath);

  form.append('image', buffer, {
    filename,
    contentType,
  });

  try {
    const response = await axios.post(`${AI_SERVER_URL}/ai/analyze-image`, form, {
      headers: form.getHeaders(),
      timeout: 180000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    const data = response.data;

    return {
      category: data.category || 'NORMAL',
      risk_score: data.risk_score || 0,
      confidence: data.confidence || 0,
      summary: '분석 완료',
      suggestions: [],
      ocr: null,
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
