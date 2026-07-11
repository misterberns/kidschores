"""v0.11 icon migration: emoji -> lucide icon names + brand category colors.

The Midnight+Electric redesign (BRAND-GUIDELINES v2) uses lucide line icons
everywhere; this idempotent pass rewrites stored data:

  - chores.icon / chore_categories.icon: known emoji -> lucide name
  - rewards/badges/penalties/bonuses .icon: "mdi:x" -> bare "x"
  - chore_categories.color: pre-redesign seeded hexes -> brand accent hexes

Unknown values (custom user emoji, custom colors) are LEFT IN PLACE — the
frontend DynamicIcon renders unmapped emoji as-is, so nothing breaks.

Runs at startup from main.py's lifespan (value-scan idempotent: a second run
finds nothing to rewrite). A matching Alembic revision exists for the
documented `alembic upgrade head` prod flow; both call migrate_icons().

EMOJI_TO_LUCIDE mirrors frontend/src/data/icon-catalog.ts — keep in sync.
"""
import logging

from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

EMOJI_TO_LUCIDE = {
    "📁": "folder",
    "🧹": "brush",
    "🧽": "sparkles",
    "🪥": "brush",
    "🛏️": "bed",
    "🍽️": "utensils",
    "🍳": "cooking-pot",
    "🚿": "shower-head",
    "🛋️": "sofa",
    "🌳": "trees",
    "🌱": "sprout",
    "🗑️": "trash-2",
    "👕": "shirt",
    "🧺": "washing-machine",
    "📚": "book-open",
    "📖": "book",
    "✏️": "pencil",
    "🐕": "dog",
    "🐱": "cat",
    "🐾": "paw-print",
    "📱": "smartphone",
    "🎮": "gamepad-2",
    "🎬": "clapperboard",
    "🎵": "music",
    "🍕": "pizza",
    "🍦": "ice-cream-cone",
    "🌙": "moon",
    "🧸": "toy-brick",
    "🎁": "gift",
    "⭐": "star",
    "❤️": "heart",
    "🏆": "trophy",
    "🏅": "medal",
    "🔥": "flame",
    "👑": "crown",
    "🚀": "rocket",
    "📷": "camera",
    "⚠️": "alert-triangle",
    "🎉": "party-popper",
}

# Pre-redesign seeded category hexes (both historical seeds, either case)
# -> brand accent hexes (dark-mode values from index.css .kid-<id>).
COLOR_TO_BRAND = {
    "#8b5cf6": "#A78BFA",  # Bedroom violet-ish -> violet
    "#f59e0b": "#FBBF24",  # Kitchen amber -> amber
    "#3b82f6": "#38BDF8",  # Bathroom blue -> cyan
    "#06b6d4": "#38BDF8",  # legacy Bathroom cyan -> cyan
    "#10b981": "#A3E635",  # Living Room green -> lime
    "#22c55e": "#A3E635",  # Outdoor green -> lime
    "#6366f1": "#A78BFA",  # School indigo -> violet
    "#ec4899": "#FB6FB1",  # Pet Care pink -> magenta
    "#14b8a6": "#38BDF8",  # Laundry teal -> cyan
}

_ICON_TABLES_EMOJI = ("chores", "chore_categories")
_ICON_TABLES_MDI = ("rewards", "badges", "penalties", "bonuses", "chores", "chore_categories")


def migrate_icons(db: Session) -> dict:
    """Rewrite legacy icon/color values. Returns per-kind change counts."""
    changed = {"emoji": 0, "mdi": 0, "color": 0}

    for table in _ICON_TABLES_EMOJI:
        for emoji, name in EMOJI_TO_LUCIDE.items():
            res = db.execute(
                text(f"UPDATE {table} SET icon = :name WHERE icon = :emoji"),  # noqa: S608 — fixed table list
                {"name": name, "emoji": emoji},
            )
            changed["emoji"] += res.rowcount or 0

    for table in _ICON_TABLES_MDI:
        res = db.execute(
            text(
                f"UPDATE {table} SET icon = substr(icon, 5) "  # noqa: S608
                "WHERE icon LIKE 'mdi:%'"
            )
        )
        changed["mdi"] += res.rowcount or 0

    for old, new in COLOR_TO_BRAND.items():
        res = db.execute(
            text("UPDATE chore_categories SET color = :new WHERE lower(color) = :old"),
            {"new": new, "old": old},
        )
        changed["color"] += res.rowcount or 0

    db.commit()
    total = sum(changed.values())
    if total:
        logger.info(
            "Icon migration rewrote %d values (emoji->lucide: %d, mdi-strip: %d, colors: %d)",
            total, changed["emoji"], changed["mdi"], changed["color"],
        )
    return changed
