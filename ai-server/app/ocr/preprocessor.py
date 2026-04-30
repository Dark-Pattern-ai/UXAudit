"""OCR 전처리 모듈 - 스크린샷 이미지 최적화"""
import cv2
import numpy as np
from PIL import Image

class ImagePreprocessor:
    """OCR 정확도를 높이기 위한 이미지 전처리"""

    @staticmethod
    def preprocess_for_ocr(image: Image.Image) -> Image.Image:
        """
        스크린샷 → OCR에 최적화된 이미지로 변환
        - 리사이즈, 그레이스케일, 이진화, 노이즈 제거
        """
        img_array = np.array(image)

        # BGR → 그레이스케일
        if len(img_array.shape) == 3:
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        else:
            gray = img_array

        # 해상도가 너무 낮으면 업스케일
        h, w = gray.shape
        if w < 1000:
            scale = 1500 / w
            gray = cv2.resize(gray, None, fx=scale, fy=scale,
                            interpolation=cv2.INTER_CUBIC)

        # 적응형 이진화 (텍스트 선명하게)
        binary = cv2.adaptiveThreshold(
            gray, 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            blockSize=11,
            C=2
        )

        # 노이즈 제거
        denoised = cv2.fastNlMeansDenoising(binary, h=10)

        return Image.fromarray(denoised)

    @staticmethod
    def extract_ui_regions(image: Image.Image) -> list:
        """
        UI 요소별 영역 분리 (버튼, 텍스트 영역 등)
        다크패턴은 특정 UI 요소에 집중되므로 영역 분리가 중요
        """
        img_array = np.array(image)
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL,
                                        cv2.CHAIN_APPROX_SIMPLE)

        regions = []
        for cnt in contours:
            x, y, w, h = cv2.boundingRect(cnt)
            if w > 50 and h > 20:  # 너무 작은 영역 무시
                region = image.crop((x, y, x + w, y + h))
                regions.append({
                    "bbox": (x, y, x + w, y + h),
                    "image": region
                })

        return regions
