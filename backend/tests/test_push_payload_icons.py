"""Push payload artwork paths must be REAL files under frontend/public/.

The v0.13.0 Brave-icon bug: the payload pointed at /icons/icon-192x192.png +
/icons/badge-72x72.png, which don't exist — nginx's SPA fallback served the
HTML shell there, the browser rejected it as an image, and every notification
rendered with the BROWSER's icon instead of the KidsChores spark.

This test cross-checks the backend constants against the frontend's public/
directory so a rename on either side fails CI instead of silently regressing.
Skips when the frontend tree isn't present (e.g. inside the backend container).
"""
from pathlib import Path

import pytest

from app.services.push_service import DEFAULT_BADGE, DEFAULT_ICON

FRONTEND_PUBLIC = Path(__file__).resolve().parents[2] / "frontend" / "public"

pytestmark = pytest.mark.skipif(
    not FRONTEND_PUBLIC.is_dir(),
    reason="frontend/public not present in this environment",
)


@pytest.mark.parametrize("web_path", [DEFAULT_ICON, DEFAULT_BADGE])
def test_default_artwork_exists_in_frontend_public(web_path: str) -> None:
    assert web_path.startswith("/"), f"{web_path} must be an absolute web path"
    file = FRONTEND_PUBLIC / web_path.lstrip("/")
    assert file.is_file(), (
        f"{web_path} not found at {file} — a missing file gets the nginx SPA "
        "fallback (HTML) and the browser replaces the notification icon with "
        "its own logo (the v0.13.0 Brave-icon bug)"
    )


def test_no_phantom_icons_directory_paths() -> None:
    """The old /icons/* paths must never come back."""
    source = (
        Path(__file__).resolve().parents[1] / "app" / "services" / "push_service.py"
    ).read_text(encoding="utf-8")
    assert '"/icons/' not in source, "phantom /icons/* path reintroduced"
