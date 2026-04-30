"""OCR 유틸리티"""

def clean_ocr_text(text: str) -> str:
    """OCR 결과 텍스트 정제"""
    import re

    if not text:
        return ""

    # 연속 공백/개행 정리
    text = re.sub(r'\s+', ' ', text)
    # 특수문자 노이즈 제거
    text = re.sub(r'[^\w\sㄱ-ㅎ가-힣.,!?%₩$€£¥()~\-/]', '', text)
    return text.strip()
