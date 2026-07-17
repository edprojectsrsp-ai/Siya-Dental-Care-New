#!/usr/bin/env python3
"""Import pasted Google review text as durable slideshow backup testimonials."""
from __future__ import annotations

import os
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ENV_FILE = ROOT / ".env"


NEGATIVE_MARKERS = (
    "disappointing experience",
    "subpar",
    "unbearable pain",
    "lack of respect",
    "waste of money",
    "poor quality",
    "would not recommend",
    "service was definitely poor",
)


def load_env() -> dict[str, str]:
    env = dict(os.environ)
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            env.setdefault(key.strip(), value.strip().strip('"').strip("'"))
    return env


def should_skip_text(text: str) -> bool:
    low = text.lower()
    return any(marker in low for marker in NEGATIVE_MARKERS)


def parse_reviews(raw: str) -> list[dict[str, str]]:
    lines = [line.strip() for line in raw.replace("\r\n", "\n").split("\n")]
    entries: list[dict[str, str]] = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if not line.endswith("open_in_new") or line == "SIYA DENTAL CARE":
            i += 1
            continue

        name = line.replace("open_in_new", "").strip()
        i += 1

        while i < len(lines) and not lines[i]:
            i += 1
        if i < len(lines):
            i += 1  # reviews/photos metadata

        while i < len(lines) and not lines[i]:
            i += 1
        if i < len(lines) and "starstarstarstarstar" in lines[i]:
            rating_line = lines[i]
            i += 1
        else:
            rating_line = ""

        text_parts: list[str] = []
        while i < len(lines):
            probe = lines[i]
            if probe == "SIYA DENTAL CARE":
                break
            if probe.endswith("open_in_new"):
                break
            if probe and probe != "Owner" and "starstarstarstarstar" not in probe:
                text_parts.append(probe)
            i += 1

        text = "\n".join(part for part in text_parts if part).strip()
        if text and not should_skip_text(text):
            entries.append({
                "patient_name": name[:100],
                "rating": "5" if "starstarstarstarstar" in rating_line else "4",
                "text": text[:2000],
            })

        while i < len(lines) and not lines[i].endswith("open_in_new"):
            i += 1

    return entries


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python backend/scripts/import_google_review_backup.py <pasted-text-file>")
        return 1

    try:
        import psycopg2  # type: ignore
    except Exception as exc:
        print(f"psycopg2 is required: {exc}")
        return 1

    source_file = Path(sys.argv[1])
    if not source_file.exists():
        print(f"File not found: {source_file}")
        return 1

    entries = parse_reviews(source_file.read_text(encoding="utf-8", errors="replace"))
    if not entries:
        print("No usable written reviews found.")
        return 0

    env = load_env()
    db_url = env.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cur = conn.cursor()

    cur.execute(r"""
        SELECT lower(patient_name), lower(regexp_replace(text, '\s+', ' ', 'g'))
        FROM site_testimonials
        WHERE is_active = TRUE
    """)
    existing = {(name, text.strip()) for name, text in cur.fetchall()}

    cur.execute("SELECT COALESCE(MAX(order_idx), 0) FROM site_testimonials")
    next_order = int(cur.fetchone()[0] or 0) + 1
    inserted = 0

    for entry in entries:
        norm_name = entry["patient_name"].lower().strip()
        norm_text = re.sub(r"\s+", " ", entry["text"].lower()).strip()
        if (norm_name, norm_text) in existing:
            continue
        cur.execute("""
            INSERT INTO site_testimonials (
                patient_name, patient_photo_url, rating, text, treatment_type,
                source, is_featured, is_active, order_idx
            ) VALUES (
                %s, NULL, %s, %s, %s,
                'google_backup', FALSE, TRUE, %s
            )
        """, (
            entry["patient_name"],
            int(entry["rating"]),
            entry["text"],
            "Google review backup",
            next_order,
        ))
        existing.add((norm_name, norm_text))
        next_order += 1
        inserted += 1

    cur.close()
    conn.close()
    print(f"Inserted backup reviews: {inserted}")
    print(f"Parsed usable written reviews: {len(entries)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
