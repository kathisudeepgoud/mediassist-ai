"""
PDF Page Rendering Module
MedAssist AI — High-DPI Page Rendering for Scanned Documents
"""

import fitz
import numpy as np
from PIL import Image
from typing import Tuple


class PageRenderer:
    """
    Renders PDF pages to high-resolution raster images (300 DPI) for OCR and image preprocessing.
    """
    DEFAULT_DPI = 300

    @classmethod
    def render_page_to_numpy(cls, page: fitz.Page, dpi: int = DEFAULT_DPI) -> Tuple[np.ndarray, float]:
        """
        Renders page to RGB numpy array. Returns (image_array, scale_factor).
        Scale factor maps pixel coordinates back to PDF points (72 DPI).
        """
        zoom = dpi / 72.0
        matrix = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=matrix, alpha=False)

        # Convert pixmap to numpy array (H, W, 3)
        img = np.frombuffer(pix.samples, dtype=np.uint8).reshape((pix.height, pix.width, 3))
        scale_factor = 72.0 / dpi  # multiply pixel coords by this to get PDF points
        return img, scale_factor

    @classmethod
    def render_page_to_pil(cls, page: fitz.Page, dpi: int = DEFAULT_DPI) -> Image.Image:
        img_np, _ = cls.render_page_to_numpy(page, dpi)
        return Image.fromarray(img_np)
