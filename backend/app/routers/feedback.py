"""In-app problem reports (v0.17.0).

Any authenticated user (kids included — the whole point) can POST a report;
parents list and review them. On submit, all parents get a web push (the
first real caller of notify_all_parents) and a branded email, both via
BackgroundTasks that open their OWN sessions (the request session is closed
by the time they run — same idiom as chores.notify_parents_chore_claimed).
"""
import logging
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload

from ..database import get_db, SessionLocal
from ..deps import get_user_kid, require_auth, require_parent
from ..models import Feedback, Parent, User
from ..services.email_service import email_service
from ..timeutil import local_day_bounds_utc
from .notifications import notify_all_parents

logger = logging.getLogger(__name__)

router = APIRouter()

# Per-user, per-local-day cap. Kids tapping enthusiastically shouldn't be able
# to page every parent device endlessly; 5 is plenty for genuine reports.
FEEDBACK_DAILY_CAP = 5


class FeedbackCreate(BaseModel):
    message: str = Field(min_length=3, max_length=1000)
    app_version: Optional[str] = Field(default=None, max_length=20)
    page_path: Optional[str] = Field(default=None, max_length=200)


class FeedbackResponse(BaseModel):
    id: str
    reporter_name: str
    role: str
    message: str
    app_version: Optional[str]
    page_path: Optional[str]
    status: str
    reviewed_by: Optional[str]
    reviewed_at: Optional[datetime]
    created_at: datetime


def _reporter_name(item: Feedback) -> str:
    if item.kid is not None:
        return item.kid.name
    if item.user is not None:
        return item.user.display_name or item.user.email
    return "Unknown"


def _to_response(item: Feedback) -> FeedbackResponse:
    return FeedbackResponse(
        id=item.id,
        reporter_name=_reporter_name(item),
        role=item.role,
        message=item.message,
        app_version=item.app_version,
        page_path=item.page_path,
        status=item.status,
        reviewed_by=item.reviewed_by,
        reviewed_at=item.reviewed_at,
        created_at=item.created_at,
    )


async def fanout_feedback(feedback_id: str):
    """Push + email all parents about a new report. Own session; never raises."""
    db = SessionLocal()
    try:
        item = db.query(Feedback).options(
            joinedload(Feedback.kid), joinedload(Feedback.user)
        ).filter(Feedback.id == feedback_id).first()
        if item is None:
            return
        reporter = _reporter_name(item)

        notify_all_parents(
            db,
            title=f"Problem report from {reporter}",
            body=item.message[:120],
            tag="feedback",
            url="/admin",
        )

        if email_service.is_configured():
            parents = db.query(Parent).filter(Parent.user_id.isnot(None)).all()
            for parent in parents:
                user = db.query(User).filter(User.id == parent.user_id).first()
                if user and user.email:
                    await email_service.send_bug_report_email(
                        to_email=user.email,
                        parent_name=parent.name,
                        reporter_name=reporter,
                        role=item.role,
                        message=item.message,
                        app_version=item.app_version or "",
                        page_path=item.page_path or "",
                    )
    except Exception as e:
        logger.error(f"Background task fanout_feedback failed: {e}")
    finally:
        db.close()


@router.post("", response_model=FeedbackResponse, status_code=201)
@router.post("/", response_model=FeedbackResponse, status_code=201, include_in_schema=False)
def create_feedback(
    body: FeedbackCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(require_auth),
):
    """Submit a problem report (any authenticated role)."""
    day_start, day_end = local_day_bounds_utc()
    todays = db.query(Feedback).filter(
        Feedback.user_id == user.id,
        Feedback.created_at >= day_start,
        Feedback.created_at < day_end,
    ).count()
    if todays >= FEEDBACK_DAILY_CAP:
        raise HTTPException(
            status_code=429,
            detail="You've sent a lot of reports today — thanks! Try again tomorrow.",
        )

    # role/kid_id derived server-side — never trusted from the client.
    kid = get_user_kid(db, user)
    item = Feedback(
        user_id=user.id,
        kid_id=kid.id if kid else None,
        role="kid" if kid else "parent",
        message=body.message,
        app_version=body.app_version,
        page_path=body.page_path,
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    background_tasks.add_task(fanout_feedback, item.id)
    return _to_response(item)


@router.get("", response_model=List[FeedbackResponse])
@router.get("/", response_model=List[FeedbackResponse], include_in_schema=False)
def list_feedback(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    _user: User = Depends(require_parent),
):
    """List reports for parents, newest first. Optional ?status=new|reviewed."""
    query = db.query(Feedback).options(
        joinedload(Feedback.kid), joinedload(Feedback.user)
    )
    if status:
        query = query.filter(Feedback.status == status)
    items = query.order_by(Feedback.created_at.desc()).all()
    return [_to_response(i) for i in items]


@router.post("/{feedback_id}/review", response_model=FeedbackResponse)
def review_feedback(
    feedback_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_parent),
):
    """Mark a report reviewed."""
    item = db.query(Feedback).options(
        joinedload(Feedback.kid), joinedload(Feedback.user)
    ).filter(Feedback.id == feedback_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Report not found")

    item.status = "reviewed"
    item.reviewed_by = admin.display_name or admin.email
    item.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(item)
    return _to_response(item)
