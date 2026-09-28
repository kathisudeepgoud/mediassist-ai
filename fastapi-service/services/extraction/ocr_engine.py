"""
Multi-Engine OCR & Spatial Bounding Box Extraction Module
MedAssist AI — PaddleOCR with Deterministic Tesseract Fallback
"""

import logging
import numpy as np
from typing import List, Tuple, Optional
from .models import SpatialToken, BoundingBox

logger = logging.getLogger(__name__)

_PADDLE_OCR_INSTANCE = None


def get_paddle_ocr():
    global _PADDLE_OCR_INSTANCE
    if _PADDLE_OCR_INSTANCE is None:
        try:
            from paddleocr import PaddleOCR
            _PADDLE_OCR_INSTANCE = PaddleOCR(lang="en")
            logger.info("PaddleOCR engine initialized successfully.")
        except Exception as e:
            logger.warning(f"PaddleOCR failed to initialize: {e}")
            _PADDLE_OCR_INSTANCE = False
    return _PADDLE_OCR_INSTANCE if _PADDLE_OCR_INSTANCE is not False else None


class OCREngineService:
    """
    Executes PaddleOCR on rasterized page images, scaling pixel bounding boxes back to PDF coordinate space.
    Falls back deterministically to Tesseract when OCR confidence is low.
    """

    MIN_ACCEPTABLE_OCR_CONFIDENCE = 0.60

    @classmethod
    def ocr_page(
        cls,
        image_np: np.ndarray,
        page_num: int,
        scale_factor: float
    ) -> Tuple[List[SpatialToken], str, float]:
        """
        Executes OCR on an image numpy array.
        Returns: (tokens, engine_used, avg_confidence)
        """
        tokens: List[SpatialToken] = []
        paddle = get_paddle_ocr()

        if paddle is not None:
            try:
                results = paddle.ocr(image_np)
                if results and results[0]:
                    page_results = results[0]
                    conf_sum = 0.0

                    for line_item in page_results:
                        if not line_item or len(line_item) < 2:
                            continue
                        poly_box, (text_val, conf) = line_item
                        if not text_val or not text_val.strip():
                            continue

                        xs = [p[0] for p in poly_box]
                        ys = [p[1] for p in poly_box]

                        x0 = min(xs) * scale_factor
                        y0 = min(ys) * scale_factor
                        x1 = max(xs) * scale_factor
                        y1 = max(ys) * scale_factor

                        conf_val = float(conf)
                        conf_sum += conf_val

                        words = text_val.strip().split()
                        if len(words) <= 1:
                            tokens.append(SpatialToken(
                                text=text_val.strip(),
                                normalized_text=text_val.strip(),
                                raw_text=text_val,
                                bbox=BoundingBox(x0=x0, y0=y0, x1=x1, y1=y1),
                                page=page_num,
                                confidence=conf_val,
                                source_engine="paddleocr"
                            ))
                        else:
                            total_chars = max(1, sum(len(w) for w in words))
                            curr_x0 = x0
                            total_w = x1 - x0
                            for w in words:
                                w_ratio = len(w) / total_chars
                                w_width = total_w * w_ratio
                                tokens.append(SpatialToken(
                                    text=w,
                                    normalized_text=w,
                                    raw_text=w,
                                    bbox=BoundingBox(x0=curr_x0, y0=y0, x1=curr_x0 + w_width, y1=y1),
                                    page=page_num,
                                    confidence=conf_val,
                                    source_engine="paddleocr"
                                ))
                                curr_x0 += w_width + 2.0

                    avg_conf = conf_sum / max(1, len(page_results))
                    if avg_conf >= cls.MIN_ACCEPTABLE_OCR_CONFIDENCE and len(tokens) > 0:
                        return tokens, "paddleocr", avg_conf

            except Exception as e:
                logger.warning(f"PaddleOCR execution error: {e}")

        # Tesseract fallback if available
        tess_tokens, tess_conf = cls._run_tesseract(image_np, page_num, scale_factor)
        if tess_tokens:
            return tess_tokens, "tesseract", tess_conf

        return tokens, "none", 0.0

    @classmethod
    def _run_tesseract(
        cls,
        image_np: np.ndarray,
        page_num: int,
        scale_factor: float
    ) -> Tuple[List[SpatialToken], float]:
        try:
            import pytesseract
            from PIL import Image

            pil_img = Image.fromarray(image_np)
            data = pytesseract.image_to_data(pil_img, output_type=pytesseract.Output.DICT)

            tokens: List[SpatialToken] = []
            conf_sum = 0.0
            valid_words = 0

            n_boxes = len(data["text"])
            for i in range(n_boxes):
                word_text = data["text"][i].strip()
                if not word_text:
                    continue

                conf_val = float(data["conf"][i])
                if conf_val < 0:
                    conf_val = 60.0

                norm_conf = conf_val / 100.0
                conf_sum += norm_conf
                valid_words += 1

                x = data["left"][i] * scale_factor
                y = data["top"][i] * scale_factor
                w = data["width"][i] * scale_factor
                h = data["height"][i] * scale_factor

                tokens.append(SpatialToken(
                    text=word_text,
                    normalized_text=word_text,
                    raw_text=word_text,
                    bbox=BoundingBox(x0=x, y0=y, x1=x + w, y1=y + h),
                    page=page_num,
                    confidence=norm_conf,
                    source_engine="tesseract"
                ))

            avg_conf = conf_sum / max(1, valid_words)
            return tokens, avg_conf
        except Exception as e:
            logger.warning(f"Tesseract OCR fallback failed: {e}")
            return [], 0.0
