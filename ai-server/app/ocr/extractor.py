import easyocr
import numpy as np
from PIL import Image
import io
from typing import Dict, List

# EasyOCR Reader 초기화 (한 번만 실행)
reader = easyocr.Reader(['ko', 'en'], gpu=False)

def extract_text_from_image(image_bytes: bytes) -> Dict:
    """
    이미지 바이트에서 텍스트와 메타데이터를 추출
    """
    try:
        # PIL 이미지로 변환
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        image_np = np.array(image)
        
        # OCR 실행 (bbox, text, confidence 반환)
        results = reader.readtext(image_np, detail=1)
        
        extracted_blocks = []
        all_text = []
        
        for bbox, text, confidence in results:
            if confidence > 0.3:  # 신뢰도 필터링
                extracted_blocks.append({
                    "text": text.strip(),
                    "bbox": bbox,
                    "confidence": round(confidence, 3)
                })
                all_text.append(text.strip())
        
        full_text = " ".join(all_text)
        
        return {
            "full_text": full_text,
            "blocks": extracted_blocks,
            "total_blocks": len(extracted_blocks)
        }
        
    except Exception as e:
        return {
            "full_text": "",
            "blocks": [],
            "total_blocks": 0,
            "error": str(e)
        }
