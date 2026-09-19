#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Update the GA4 measurement ID used by the consent-controlled loader.

This script deliberately does not inject a direct Google Analytics tag. Analytics
must remain behind ``assets/consent.js`` so that the default-denied Consent Mode
command runs first and no Analytics request is made before opt-in.

Run from the repository root:
    python3 add-google-analytics.py
"""

from pathlib import Path
import re

GA_MEASUREMENT_ID = "G-JSG9KGPK0S"
CONSENT_TAG_PATTERN = re.compile(
    r'<script\b[^>]*\bsrc="[^"]*assets/consent\.js"[^>]*></script>',
    re.IGNORECASE,
)
MEASUREMENT_PATTERN = re.compile(
    r'(\bdata-measurement-id=")[^"]*(")', re.IGNORECASE
)


def process_file(path: Path) -> str:
    content = path.read_text(encoding="utf-8", errors="replace")
    match = CONSENT_TAG_PATTERN.search(content)
    if not match:
        return "missing-consent-loader"

    tag = match.group(0)
    if MEASUREMENT_PATTERN.search(tag):
        new_tag = MEASUREMENT_PATTERN.sub(
            rf"\g<1>{GA_MEASUREMENT_ID}\g<2>", tag, count=1
        )
    else:
        new_tag = tag.replace(">", f' data-measurement-id="{GA_MEASUREMENT_ID}">', 1)

    if new_tag == tag:
        return "unchanged"
    updated = content[:match.start()] + new_tag + content[match.end():]
    path.write_text(updated, encoding="utf-8")
    return "updated"


def main() -> None:
    if not Path("index.html").is_file():
        raise SystemExit("Run this script from the repository root.")

    pages = sorted(Path(".").rglob("*.html"))
    stats: dict[str, int] = {}
    problems: list[tuple[Path, str]] = []

    for page in pages:
        if any(part in {".git", "node_modules", ".netlify"} for part in page.parts):
            continue
        result = process_file(page)
        stats[result] = stats.get(result, 0) + 1
        if result.startswith("missing-"):
            problems.append((page, result))

    print(f"Updated: {stats.get('updated', 0)}")
    print(f"Already current: {stats.get('unchanged', 0)}")
    if problems:
        print("Pages requiring manual consent-loader review:")
        for page, reason in problems:
            print(f"  - {page}: {reason}")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
