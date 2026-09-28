"""
Digital PDF Text & Spatial Token Extraction Module
MedAssist AI — High-Precision PyMuPDF Spatial Token Extraction
"""

import fitz
import re
from typing import List
from .models import SpatialToken, BoundingBox


class DigitalExtractor:
    """
    Extracts spatial tokens with exact bounding box coordinates from digital PDF pages using PyMuPDF.
    Preserves raw text, normalized text, font info, block/line index, and page number.
    """

    @classmethod
    def extract_page_tokens(cls, page: fitz.Page, page_num: int) -> List[SpatialToken]:
        tokens: List[SpatialToken] = []

        # 1. Use page.get_text("words") for word-level bounding boxes (x0, y0, x1, y1, word, block_no, line_no, word_no)
        raw_words = page.get_text("words")

        # Also retrieve font/block spans if available for rich attributes
        span_font_sizes = {}
        try:
            blocks = page.get_text("dict")["blocks"]
            for b in blocks:
                if "lines" in b:
                    for l in b["lines"]:
                        for s in l["spans"]:
                            s_bbox = s["bbox"]
                            s_key = (round(s_bbox[0], 1), round(s_bbox[1], 1))
                            span_font_sizes[s_key] = {
                                "size": s.get("size"),
                                "flags": s.get("flags", 0),
                                "font": s.get("font", "")
                            }
        except Exception:
            pass

        for item in raw_words:
            if len(item) >= 5:
                x0, y0, x1, y1, word = item[0], item[1], item[2], item[3], str(item[4])
                block_no = item[5] if len(item) > 5 else None
                line_no = item[6] if len(item) > 6 else None

                word_clean = word.strip()
                if not word_clean:
                    continue

                norm_text = re.sub(r'[\s\u00a0\ufeff]+', ' ', word_clean)
                norm_text = re.sub(r'[\u2010\u2011\u2012\u2013\u2014\u2212]', '-', norm_text)

                # Check font attributes
                key = (round(x0, 1), round(y0, 1))
                font_info = span_font_sizes.get(key, {})
                font_size = font_info.get("size")
                is_bold = bool(font_info.get("flags", 0) & 2) or "bold" in font_info.get("font", "").lower()

                token = SpatialToken(
                    text=word_clean,
                    normalized_text=norm_text,
                    raw_text=word,
                    bbox=BoundingBox(x0=x0, y0=y0, x1=x1, y1=y1),
                    page=page_num,
                    confidence=1.0,
                    source_engine="pymupdf",
                    font_size=font_size,
                    is_bold=is_bold,
                    block_num=block_no,
                    line_num=line_no
                )
                tokens.append(token)

        return tokens
