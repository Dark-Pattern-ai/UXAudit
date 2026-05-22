/**
 * ocrEngine.js
 * OCR은 AI 서버(Python/EasyOCR)에서 처리하므로 백엔드에서는 빈 결과 반환
 */

async function extractText(imageBuffer) {
  return {
    text: '',
    lines: [],
    confidence: 0,
    success: false,
  };
}

module.exports = { extractText };
