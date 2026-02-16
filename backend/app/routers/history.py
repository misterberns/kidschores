"""Chore history and analytics API endpoints."""
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from pydantic import BaseModel

from ..database import get_db
from ..models import Kid, Chore, ChoreClaim, ChoreCategory

router = APIRouter()


# Response models
class HistoryItem(BaseModel):
    """Single history entry."""
    id: str
    chore_id: str
    chore_name: str
    chore_icon: str
    category_name: Optional[str]
    category_color: Optional[str]
    status: str
    points_awarded: Optional[float]
    claimed_at: datetime
    approved_at: Optional[datetime]
    approved_by: Optional[str]
    notes: Optional[str]

    class Config:
        from_attributes = True


class HistoryResponse(BaseModel):
    """Paginated history response."""
    items: List[HistoryItem]
    total: int
    page: int
    per_page: int
    has_more: bool


class DailyStats(BaseModel):
    """Stats for a single day."""
    date: str
    completed: int
    total_points: float


class CategoryStats(BaseModel):
    """Stats for a category."""
    category_id: Optional[str]
    category_name: str
    category_color: str
    count: int
    points: float


class AnalyticsResponse(BaseModel):
    """Analytics summary response."""
    kid_id: str
    kid_name: str
    # Overall stats
    total_chores_completed: int
    total_points_earned: float
    average_points_per_chore: float
    # Time-based
    chores_today: int
    chores_this_week: int
    chores_this_month: int
    points_today: float
    points_this_week: float
    points_this_month: float
    # Streaks
    current_streak: int
    longest_streak: int
    # Daily breakdown for chart
    daily_stats: List[DailyStats]
    # Category breakdown
    category_stats: List[CategoryStats]
    # Top chores
    top_chores: List[dict]


@router.get("/{kid_id}", response_model=HistoryResponse)
def get_history(
    kid_id: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    category_id: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    """Get paginated chore history for a kid."""
    # Base query with joins to avoid N+1
    query = (
        db.query(ChoreClaim, Chore, ChoreCategory)
        .join(Chore, ChoreClaim.chore_id == Chore.id, isouter=True)
        .join(ChoreCategory, Chore.category_id == ChoreCategory.id, isouter=True)
        .filter(ChoreClaim.kid_id == kid_id)
    )

    # Apply filters
    if status:
        query = query.filter(ChoreClaim.status == status)
    if start_date:
        query = query.filter(ChoreClaim.claimed_at >= start_date)
    if end_date:
        query = query.filter(ChoreClaim.claimed_at <= end_date)
    if category_id:
        query = query.filter(Chore.category_id == category_id)

    # Get total count
    total = query.count()

    # Apply pagination
    offset = (page - 1) * per_page
    rows = query.order_by(ChoreClaim.claimed_at.desc()).offset(offset).limit(per_page).all()

    # Build response items from joined results
    items = []
    for claim, chore, category in rows:
        items.append(HistoryItem(
            id=claim.id,
            chore_id=claim.chore_id,
            chore_name=chore.name if chore else "Unknown",
            chore_icon=chore.icon if chore else "🧹",
            category_name=category.name if category else None,
            category_color=category.color if category else None,
            status=claim.status,
            points_awarded=claim.points_awarded,
            claimed_at=claim.claimed_at,
            approved_at=claim.approved_at,
            approved_by=claim.approved_by,
            notes=claim.notes,
        ))

    return HistoryResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        has_more=(offset + len(items)) < total,
    )


@router.get("/stats/{kid_id}", response_model=AnalyticsResponse)
def get_analytics(
    kid_id: str,
    days: int = Query(30, ge=7, le=365),
    db: Session = Depends(get_db)
):
    """Get analytics summary for a kid."""
    kid = db.query(Kid).filter(Kid.id == kid_id).first()
    if not kid:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Kid not found")

    # Date ranges — strip tzinfo for SQLite compatibility (SQLite stores naive datetimes;
    # comparing aware vs naive raises TypeError for old records created before v0.5.2)
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())
    month_start = today_start.replace(day=1)

    # Bulk-load all chores and categories (2 queries total instead of N+1)
    all_chores = {c.id: c for c in db.query(Chore).all()}
    all_categories = {c.id: c for c in db.query(ChoreCategory).all()}

    # Overall stats (approved claims only)
    approved_claims = db.query(ChoreClaim).filter(
        ChoreClaim.kid_id == kid_id,
        ChoreClaim.status == "approved"
    ).all()

    total_completed = len(approved_claims)
    total_points = sum(c.points_awarded or 0 for c in approved_claims)
    avg_points = total_points / total_completed if total_completed > 0 else 0

    # Time-based stats + daily grouping in a single pass
    chores_today = 0
    points_today = 0.0
    chores_this_week = 0
    points_this_week = 0.0
    chores_this_month = 0
    points_this_month = 0.0
    daily_map: dict[str, dict] = defaultdict(lambda: {"completed": 0, "total_points": 0.0})
    category_counts: dict[str, dict] = {}
    chore_counts: dict[str, dict] = {}

    for claim in approved_claims:
        pts = claim.points_awarded or 0

        # Normalize approved_at to naive UTC (handles mix of aware/naive from pre/post v0.5.2)
        approved_at = claim.approved_at
        if approved_at and approved_at.tzinfo is not None:
            approved_at = approved_at.replace(tzinfo=None)

        # Time-based aggregation
        if approved_at:
            if approved_at >= today_start:
                chores_today += 1
                points_today += pts
            if approved_at >= week_start:
                chores_this_week += 1
                points_this_week += pts
            if approved_at >= month_start:
                chores_this_month += 1
                points_this_month += pts

            # Daily stats grouping
            day_key = approved_at.strftime("%Y-%m-%d")
            daily_map[day_key]["completed"] += 1
            daily_map[day_key]["total_points"] += pts

        # Category breakdown (using bulk-loaded chores)
        chore = all_chores.get(claim.chore_id)
        if chore:
            cat_id = chore.category_id or "uncategorized"
            if cat_id not in category_counts:
                category_counts[cat_id] = {"count": 0, "points": 0.0}
            category_counts[cat_id]["count"] += 1
            category_counts[cat_id]["points"] += pts

            # Top chores
            if claim.chore_id not in chore_counts:
                chore_counts[claim.chore_id] = {
                    "chore_id": claim.chore_id,
                    "chore_name": chore.name,
                    "chore_icon": chore.icon,
                    "count": 0,
                    "points": 0.0,
                }
            chore_counts[claim.chore_id]["count"] += 1
            chore_counts[claim.chore_id]["points"] += pts

    # Build daily_stats array from the map
    daily_stats = []
    for i in range(days):
        day = today_start - timedelta(days=days - 1 - i)
        day_key = day.strftime("%Y-%m-%d")
        entry = daily_map.get(day_key, {"completed": 0, "total_points": 0.0})
        daily_stats.append(DailyStats(
            date=day_key,
            completed=entry["completed"],
            total_points=entry["total_points"],
        ))

    # Build category_stats from bulk-loaded categories
    category_stats = []
    for cat_id, stats in category_counts.items():
        if cat_id == "uncategorized":
            category_stats.append(CategoryStats(
                category_id=None,
                category_name="Uncategorized",
                category_color="#9ca3af",
                count=stats["count"],
                points=stats["points"],
            ))
        else:
            cat = all_categories.get(cat_id)
            if cat:
                category_stats.append(CategoryStats(
                    category_id=cat.id,
                    category_name=cat.name,
                    category_color=cat.color,
                    count=stats["count"],
                    points=stats["points"],
                ))

    top_chores = sorted(
        chore_counts.values(),
        key=lambda x: x["count"],
        reverse=True
    )[:5]

    return AnalyticsResponse(
        kid_id=kid_id,
        kid_name=kid.name,
        total_chores_completed=total_completed,
        total_points_earned=total_points,
        average_points_per_chore=round(avg_points, 1),
        chores_today=chores_today,
        chores_this_week=chores_this_week,
        chores_this_month=chores_this_month,
        points_today=points_today,
        points_this_week=points_this_week,
        points_this_month=points_this_month,
        current_streak=kid.overall_chore_streak or 0,
        longest_streak=kid.longest_streak_ever or 0,
        daily_stats=daily_stats,
        category_stats=category_stats,
        top_chores=top_chores,
    )


@router.get("/export/{kid_id}")
def export_history_csv(
    kid_id: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    """Export history as CSV."""
    from fastapi.responses import StreamingResponse
    import io
    import csv

    # Get kid
    kid = db.query(Kid).filter(Kid.id == kid_id).first()
    if not kid:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Kid not found")

    # Query claims with joins to avoid N+1
    query = (
        db.query(ChoreClaim, Chore, ChoreCategory)
        .join(Chore, ChoreClaim.chore_id == Chore.id, isouter=True)
        .join(ChoreCategory, Chore.category_id == ChoreCategory.id, isouter=True)
        .filter(ChoreClaim.kid_id == kid_id)
    )

    if start_date:
        query = query.filter(ChoreClaim.claimed_at >= start_date)
    if end_date:
        query = query.filter(ChoreClaim.claimed_at <= end_date)

    rows = query.order_by(ChoreClaim.claimed_at.desc()).all()

    # Build CSV
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Date", "Chore", "Category", "Status", "Points", "Approved By", "Notes"
    ])

    for claim, chore, category in rows:
        writer.writerow([
            claim.claimed_at.strftime("%Y-%m-%d %H:%M"),
            chore.name if chore else "Unknown",
            category.name if category else "",
            claim.status,
            claim.points_awarded or 0,
            claim.approved_by or "",
            claim.notes or "",
        ])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={kid.name}_chore_history.csv"
        }
    )
