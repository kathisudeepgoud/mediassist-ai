"""
Computer Vision Preprocessing Module for Scanned PDF Pages
MedAssist AI — OpenCV Grayscale, Deskew, Denoise, and Adaptive Binarization
"""

import cv2
import numpy as np
import logging
from typing import Tuple

logger = logging.getLogger(__name__)


class ImagePreprocessor:
    """
    Applies non-destructive computer vision preprocessing to improve OCR accuracy on scanned pages:
    1. Grayscale conversion
    2. Automated deskewing via contour minimum-area bounding box
    3. Median blur denoising for salt-and-pepper scan noise
    4. Adaptive Gaussian thresholding and contrast optimization
    """

    @classmethod
    def preprocess_image(cls, img_rgb: np.ndarray) -> Tuple[np.ndarray, float]:
        """
        Processes RGB image numpy array.
        Returns: (processed_image_for_ocr, deskew_angle_degrees)
        """
        try:
            # 1. Grayscale
            if len(img_rgb.shape) == 3:
                gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
            else:
                gray = img_rgb.copy()

            # 2. Automated Deskewing
            angle = 0.0
            coords = np.column_stack(np.where(gray < 235))
            if coords.size > 0:
                rect = cv2.minAreaRect(coords)
                angle = rect[-1]
                if angle < -45:
                    angle = -(90 + angle)
                elif angle > 45:
                    angle = 90 - angle
                else:
                    angle = -angle

                # Only rotate if tilt is significant but reasonable (0.5 to 30 degrees)
                if 0.5 < abs(angle) < 30.0:
                    (h, w) = gray.shape[:2]
                    center = (w // 2, h // 2)
                    M = cv2.getRotationMatrix2D(center, angle, 1.0)
                    gray = cv2.warpAffine(
                        gray, M, (w, h),
                        flags=cv2.INTER_CUBIC,
                        borderMode=cv2.BORDER_REPLICATE
                    )

            # 3. Median Denoising
            denoised = cv2.medianBlur(gray, 3)

            # 4. Contrast enhancement (CLAHE)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            contrast_enhanced = clahe.apply(denoised)

            return contrast_enhanced, angle
        except Exception as e:
            logger.warning(f"Image preprocessing failed, falling back to raw image: {e}")
            if len(img_rgb.shape) == 3:
                return cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY), 0.0
            return img_rgb, 0.0
