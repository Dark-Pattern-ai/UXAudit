import easyocr
import re

reader = easyocr.Reader(["ko", "en"], gpu=False)


def clean_text(text: str) -> str:
    text = re.sub(r"[^\w\sㄱ-ㅎ가-힣a-zA-Z0-9%.,!?·~\-():]", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def extract_text(image_path: str) -> dict:
    results = reader.readtext(image_path)

    elements = []
    full_texts = []

    for bbox, text, confidence in results:
        if confidence < 0.3:
            continue
        cleaned = clean_text(text)
        if len(cleaned) < 2:
            continue
        elements.append(
            {
                "text": cleaned,
                "confidence": round(confidence, 3),
                "bbox": bbox,
            }
        )
        full_texts.append(cleaned)

    return {
        "full_text": " ".join(full_texts),
        "elements": elements,
        "element_count": len(elements),
    }
