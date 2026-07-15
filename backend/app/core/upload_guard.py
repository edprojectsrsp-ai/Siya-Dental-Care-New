"""Shared validation for user file uploads.

Every upload endpoint must go through safe_ext() + check_size() so that:
- only known-safe file types land on disk (no .html/.svg/.exe → stored XSS/malware),
- a filename can never carry directory components (../ traversal on write),
- a single request can't fill the disk.
"""
from fastapi import HTTPException

# Images + documents a dental clinic legitimately stores (RVG/OPG exports, PDFs, DICOM).
ALLOWED_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".bmp", ".pdf", ".dcm"}

MAX_UPLOAD_BYTES = 25 * 1024 * 1024  # 25 MB


def safe_ext(filename: str | None, default: str = ".jpg") -> str:
    """Return a validated lowercase extension from a client filename.

    Rejects disallowed types; ignores any directory components in the name.
    """
    name = (filename or "").replace("\\", "/").rsplit("/", 1)[-1]
    dot = name.rfind(".")
    ext = name[dot:].lower() if dot != -1 else default
    if ext not in ALLOWED_EXTS:
        raise HTTPException(400, f"File type '{ext}' not allowed. Allowed: {', '.join(sorted(ALLOWED_EXTS))}")
    return ext


def check_size(content: bytes) -> None:
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(400, f"File too large. Max size is {MAX_UPLOAD_BYTES // (1024*1024)}MB.")
