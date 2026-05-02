import os
import numpy as np
import joblib
import torch
from transformers import AutoTokenizer, AutoModel, AutoProcessor
from PIL import Image
import io
from typing import Dict

# ================================
# 경로 설정
# ================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "..", "models")

# ================================
# 모델 로드 (서버 시작 시 1회만)
# ================================
print("모델 로딩 중...")

device = "cuda" if torch.cuda.is_available() else "cpu"

# 1) LR 분류기 로드
binary_model = joblib.load(os.path.join(MODEL_DIR, "exp3_lr_binary_2class.pkl"))
category_model = joblib.load(os.path.join(MODEL_DIR, "exp3_lr_category_5class.pkl"))

# 2) klue/roberta-base 텍스트 인코더 (768차원)
bert_tokenizer = AutoTokenizer.from_pretrained("klue/roberta-base")
bert_model = AutoModel.from_pretrained("klue/roberta-base").eval().to(device)

# 3) SigLIP 이미지 인코더 (768차원)
siglip_model = AutoModel.from_pretrained("google/siglip-base-patch16-224").eval().to(device)
siglip_processor = AutoProcessor.from_pretrained("google/siglip-base-patch16-224")

# 카테고리 이름
CATEGORY_NAMES = ["NORMAL", "MISLEADING", "OBSTRUCTING", "PRESSURING", "EXPLOITING"]

print("모델 로딩 완료!")

# ================================
# 임베딩 추출 함수
# ================================
def get_text_embedding(text: str) -> np.ndarray:
    if not text or not text.strip():
        text = "empty"
    inputs = bert_tokenizer(
        text, return_tensors="pt",
        truncation=True, max_length=512, padding=True
    ).to(device)
    with torch.no_grad():
        outputs = bert_model(**inputs)
        emb = outputs.last_hidden_state[:, 0, :]  # (1, 768)
    return emb.cpu().numpy()


def get_image_embedding(image_bytes: bytes) -> np.ndarray:
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    inputs = siglip_processor(images=[image], return_tensors="pt").to(device)
    with torch.no_grad():
        outputs = siglip_model.vision_model(**inputs)
        emb = outputs.pooler_output  # (1, 768)
        emb = emb / emb.norm(dim=-1, keepdim=True)
    return emb.cpu().numpy()


# ================================
# 메인 추론 함수
# ================================
def run_inference(image_bytes: bytes, ocr_text: str) -> Dict:
    # 임베딩 추출
    text_emb = get_text_embedding(ocr_text)      # (1, 768)
    image_emb = get_image_embedding(image_bytes)  # (1, 768)

    # 결합: SigLIP(768) + klue/roberta(768) = 1536차원
    combined = np.concatenate([image_emb, text_emb], axis=1)  # (1, 1536)

    # 2분류 예측
    binary_prob = binary_model.predict_proba(combined)[0]
    dark_prob = float(binary_prob[1])
    is_dark = dark_prob >= 0.5

    # 5분류 예측
    category_prob = category_model.predict_proba(combined)[0]
    predicted_category = CATEGORY_NAMES[int(np.argmax(category_prob))]
    category_probs = {
        name: round(float(prob), 4)
        for name, prob in zip(CATEGORY_NAMES, category_prob)
    }

    return {
        "is_dark_pattern": is_dark,
        "dark_probability": round(dark_prob, 4),
        "predicted_category": predicted_category,
        "category_probabilities": category_probs,
    }
