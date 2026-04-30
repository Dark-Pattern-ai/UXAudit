"""OCR 엔진 - Google Cloud Vision API 또는 Tesseract 사용"""
import os
import json
import logging
from typing import Optional
from PIL import Image

logger = logging.getLogger(__name__)


class OCREngine:
    """
    OCR 파이프라인 1단계 담당
    - Google Cloud Vision API (권장, 한국어 정확도 높음)
    - Tesseract (로컬 fallback)
    """

    def __init__(self, engine: str = "google"):
        """
        Args:
            engine: "google" | "tesseract"
        """
        self.engine = engine

        if engine == "google":
            self._init_google_vision()
        elif engine == "tesseract":
            self._init_tesseract()

    def _init_google_vision(self):
        """Google Cloud Vision API 초기화"""
        try:
            from google.cloud import vision
            self.client = vision.ImageAnnotatorClient()
            logger.info("Google Cloud Vision API 초기화 성공")
        except Exception as e:
            logger.warning(f"Google Vision 초기화 실패: {e}, Tesseract로 폴백")
            self.engine = "tesseract"
            self._init_tesseract()

    def _init_tesseract(self):
        """Tesseract OCR 초기화"""
        import pytesseract
        self.pytesseract = pytesseract
        logger.info("Tesseract OCR 초기화")

    def extract_text(self, image: Image.Image) -> dict:
        """
        이미지에서 텍스트 추출

        Returns:
            {
                "full_text": "전체 추출 텍스트",
                "blocks": [
                    {"text": "블록별 텍스트", "confidence": 0.95, "bbox": [x1,y1,x2,y2]}
                ]
            }
        """
        if self.engine == "google":
            return self._ocr_google(image)
        else:
            return self._ocr_tesseract(image)

    def _ocr_google(self, image: Image.Image) -> dict:
        """Google Cloud Vision OCR"""
        from google.cloud import vision
        import io

        # PIL Image → bytes
        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        content = buffer.getvalue()

        gcp_image = vision.Image(content=content)
        response = self.client.text_detection(image=gcp_image)

        if response.error.message:
            raise Exception(f"Google Vision Error: {response.error.message}")

        texts = response.text_annotations
        if not texts:
            return {"full_text": "", "blocks": []}

        full_text = texts[0].description

        blocks = []
        for text in texts[1:]:
            vertices = text.bounding_poly.vertices
            bbox = [
                vertices[0].x, vertices[0].y,
                vertices[2].x, vertices[2].y
            ]
            blocks.append({
                "text": text.description,
                "confidence": None,  # text_detection은 confidence 미제공
                "bbox": bbox
            })

        return {"full_text": full_text, "blocks": blocks}

    def _ocr_tesseract(self, image: Image.Image) -> dict:
        """Tesseract OCR (로컬)"""
        from .preprocessor import ImagePreprocessor

        # 전처리 적용
        processed = ImagePreprocessor.preprocess_for_ocr(image)

        # OCR 수행 (한국어 + 영어)
        data = self.pytesseract.image_to_data(
            processed, lang='kor+eng', output_type=self.pytesseract.Output.DICT
        )

        full_text = self.pytesseract.image_to_string(processed, lang='kor+eng')

        blocks = []
        n_boxes = len(data['text'])
        for i in range(n_boxes):
            text = data['text'][i].strip()
            conf = int(data['conf'][i])
            if text and conf > 30:  # confidence 30% 이상만
                blocks.append({
                    "text": text,
                    "confidence": conf / 100.0,
                    "bbox": [
                        data['left'][i],
                        data['top'][i],
                        data['left'][i] + data['width'][i],
                        data['top'][i] + data['height'][i]
                    ]
                })

        return {"full_text": full_text.strip(), "blocks": blocks}


# === 배치 처리 (라벨링 데이터에 OCR 텍스트 추가) ===

def batch_ocr_to_jsonl(image_dir: str, input_jsonl: str, output_jsonl: str,
                        engine: str = "tesseract"):
    """
    기존 라벨링 JSONL에 OCR 텍스트를 추가하는 배치 함수
    labels.jsonl에 text 필드가 비어있을 때 사용
    """
    ocr = OCREngine(engine=engine)
    results = []

    with open(input_jsonl, 'r', encoding='utf-8') as f:
        for line in f:
            item = json.loads(line.strip())
            if not item.get('text'):
                img_path = os.path.join(image_dir, item['image'])
                try:
                    image = Image.open(img_path).convert("RGB")
                    ocr_result = ocr.extract_text(image)
                    item['text'] = ocr_result['full_text']
                    logger.info(f"OCR 완료: {item['image']}")
                except Exception as e:
                    logger.error(f"OCR 실패 [{item['image']}]: {e}")
                    item['text'] = ""
            results.append(item)

    with open(output_jsonl, 'w', encoding='utf-8') as f:
        for item in results:
            f.write(json.dumps(item, ensure_ascii=False) + '\n')

    print(f"배치 OCR 완료: {len(results)}건 → {output_jsonl}")
