"""
PDF Ingestion & Validation Module
MedAssist AI — Strict Validation, Integrity Checks, and PDF-only Enforcement
"""

import io
import fitz
from typing import Tuple, Dict, Any, Optional


class PDFIngestionError(ValueError):
    """Raised when uploaded file fails PDF integrity, security, or validation checks."""
    pass


class PDFIngestionService:
    MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB
    MAX_PAGE_COUNT = 50
    MIN_PAGE_COUNT = 1

    @classmethod
    def validate_and_load(
        cls,
        file_bytes: bytes,
        filename: Optional[str] = None,
        content_type: Optional[str] = None
    ) -> Tuple[fitz.Document, Dict[str, Any]]:
        """
        Validates the PDF bytes:
        1. Checks size
        2. Validates PDF magic byte header (%PDF-)
        3. Validates MIME type and filename extension
        4. Rejects corrupted, encrypted, or zero-page documents
        5. Returns open fitz.Document and validated metadata dict.
        """
        if not file_bytes or len(file_bytes) == 0:
            raise PDFIngestionError("Uploaded file is empty (0 bytes).")

        if len(file_bytes) > cls.MAX_FILE_SIZE_BYTES:
            raise PDFIngestionError(f"File size exceeds maximum allowed limit of {cls.MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB.")

        # 1. Magic Bytes Check
        header = file_bytes[:1024]
        if b"%PDF-" not in header:
            # Check for image magic bytes to give an explicit, helpful rejection
            if header.startswith(b"\xff\xd8\xff") or header.startswith(b"\x89PNG\r\n\x1a\n") or header.startswith(b"GIF8") or header.startswith(b"RIFF"):
                raise PDFIngestionError("Standalone image files (JPG, PNG, GIF, WEBP) are not supported. Please upload a PDF document.")
            raise PDFIngestionError("Invalid file structure: Missing '%PDF-' magic header. Only valid PDF files are accepted.")

        # 2. Extension check
        if filename:
            fn_lower = filename.lower()
            if not fn_lower.endswith(".pdf"):
                raise PDFIngestionError(f"Invalid file extension '{filename}'. Only .pdf files are accepted.")

        # 3. Content-Type check if provided
        if content_type:
            ct_lower = content_type.lower().split(";")[0].strip()
            if ct_lower not in ["application/pdf", "application/x-pdf", "application/acrobat", "applications/vnd.pdf", "text/pdf"]:
                raise PDFIngestionError(f"Unsupported media type '{content_type}'. Expected 'application/pdf'.")

        # 4. Attempt to open with PyMuPDF to test structural integrity
        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
        except Exception as e:
            raise PDFIngestionError(f"Corrupted or unreadable PDF document: {str(e)}")

        if doc.is_encrypted:
            try:
                # Try empty password
                doc.authenticate("")
            except Exception:
                pass
            if doc.is_encrypted:
                raise PDFIngestionError("Password-protected or encrypted PDF documents are not supported.")

        page_count = len(doc)
        if page_count < cls.MIN_PAGE_COUNT:
            raise PDFIngestionError("PDF contains 0 pages.")

        if page_count > cls.MAX_PAGE_COUNT:
            raise PDFIngestionError(f"PDF page count ({page_count}) exceeds maximum allowed limit of {cls.MAX_PAGE_COUNT} pages.")

        metadata = {
            "page_count": page_count,
            "filename": filename or "report.pdf",
            "file_size": len(file_bytes),
            "pdf_version": doc.metadata.get("format") if hasattr(doc, "metadata") else None
        }

        return doc, metadata
