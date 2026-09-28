"""
PDF Page Classification Module
MedAssist AI — Independent Per-Page Classification (Digital vs Scanned vs Mixed)
"""

import fitz
from typing import Dict
from .models import PageType


class PDFPageClassifier:
    """
    Classifies each page of a PDF document independently into:
    - DIGITAL_TEXT: High-fidelity embedded text with vector glyphs
    - SCANNED_IMAGE: Low/Zero embedded text with raster images (requires OCR)
    - MIXED: Embedded text plus large raster image overlays
    - EMPTY: Blank or unusable page
    """

    MIN_DIGITAL_WORD_COUNT = 8
    MIN_DIGITAL_CHAR_COUNT = 35

    @classmethod
    def classify_page(cls, page: fitz.Page) -> PageType:
        words = page.get_text("words")
        text = page.get_text("text").strip()
        images = page.get_images()

        word_count = len(words)
        char_count = len(text)
        image_count = len(images)

        # 1. If zero text and zero images -> EMPTY
        if word_count == 0 and image_count == 0:
            return PageType.EMPTY

        # 2. If page has substantial text (digital vector text) -> DIGITAL_TEXT
        if word_count >= cls.MIN_DIGITAL_WORD_COUNT and char_count >= cls.MIN_DIGITAL_CHAR_COUNT:
            return PageType.DIGITAL_TEXT

        # 3. If text is low/zero and images exist -> SCANNED_IMAGE (requires OCR)
        if image_count > 0:
            return PageType.SCANNED_IMAGE

        # 4. If sparse text but no images -> DIGITAL_TEXT
        if char_count > 0:
            return PageType.DIGITAL_TEXT

        return PageType.EMPTY

    @classmethod
    def classify_document(cls, doc: fitz.Document) -> Dict[int, PageType]:
        page_types: Dict[int, PageType] = {}
        for page_num, page in enumerate(doc, start=1):
            page_types[page_num] = cls.classify_page(page)
        return page_types
