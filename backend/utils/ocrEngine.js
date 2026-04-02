/**
 * ocrEngine.js
 *
 * 역할: 이미지 버퍼에서 텍스트를 추출한다 (Tesseract.js 기반)
 *
 * 반환 구조:
 *   {
 *     text: string,          // 전체 추출 텍스트 (공백 정리 완료)
 *     lines: string[],       // 줄 단위 배열
 *     confidence: number,    // Tesseract OCR 신뢰도 (0–100)
 *     success: boolean,      // OCR 성공 여부 (실패해도 파이프라인 중단 안 함)
 *   }
 *
 * 주의:
 *  - OCR 실패 시 success: false + 빈 텍스트를 반환한다.
 *    → AI 분류 파이프라인이 OCR 에러로 멈추지 않도록 설계.
 *  - 첫 호출 시 Tesseract 워커가 초기화되며 약 1~2초 소요된다.
 *  - 언어: 한국어(kor) + 영어(eng) 동시 인식
 */

const Tesseract = require('tesseract.js');

/**
 * 이미지 버퍼 → OCR 텍스트 추출
 *
 * @param {Buffer} imageBuffer  multer 메모리 버퍼
 * @returns {Promise<OcrResult>}
 */
async function extractText(imageBuffer) {
  try {
    const { data } = await Tesseract.recognize(
      imageBuffer,
      'kor+eng', // 한국어 + 영어 동시 인식
      {
        logger: () => {}, // 콘솔 로그 억제
      }
    );

    const rawText = data.text ?? '';

    // 연속 공백·빈 줄 정리
    const cleanText = rawText
      .replace(/[ \t]+/g, ' ')   // 수평 공백 압축
      .replace(/\n{3,}/g, '\n\n') // 3줄 이상 빈 줄 → 2줄로
      .trim();

    const lines = cleanText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 1); // 1자 이하 노이즈 제거

    return {
      text: cleanText,
      lines,
      confidence: Math.round(data.confidence ?? 0),
      success: true,
    };
  } catch (err) {
    // OCR 실패해도 파이프라인을 멈추지 않는다
    console.error('[OCR] 추출 실패:', err.message);
    return {
      text: '',
      lines: [],
      confidence: 0,
      success: false,
    };
  }
}

module.exports = { extractText };
