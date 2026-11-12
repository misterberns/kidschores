"""Kiosk / shared-tablet mode (v0.18.0).

Two audiences:
- Parents manage kiosk devices (`/devices`): mint a claim-only token, list, revoke.
- A kiosk device, holding only that token, reads today's chores for every kid and
  claims one on a kid's behalf (`/state`, `/claim`), or ends its own session.

A kiosk token carries scopes=["kiosk"]. `get_current_user` refuses scoped tokens, so
the token reaches nothing outside this router; here it authenticates through
`require_kiosk`. It can claim and nothing else: no approve, no rewards, no settings.
"""
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import KIOSK_SCOPE, require_kiosk, require_parent
from ..models import ApiToken, Chore, Kid, User
from ..schemas import ChoreClaimResponse, TodaysChoreResponse
from ..security import generate_api_token, get_token_prefix
from ..services.chore_service import claim_chore_for_kid, latest_claims_today, todays_chores_for_kid
from .chores import schedule_claim_notifications

router = APIRouter()


# --- Schemas ---

class KioskDeviceCreate(BaseModel):
    name: str = Field(default="Kitchen tablet", min_length=1, max_length=60)


class KioskDevice(BaseModel):
    id: str
    name: str
    token_prefix: str
    created_at: datetime
    last_used: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class KioskDeviceCreated(KioskDevice):
    token: str  # shown once


class KioskKid(BaseModel):
    id: str
    name: str
    points: float
    chores: List[TodaysChoreResponse]


class KioskState(BaseModel):
    device_name: str
    kids: List[KioskKid]


class KioskClaimRequest(BaseModel):
    kid_id: str
    chore_id: str


def _kiosk_tokens(db: Session):
    # Single-family model: any parent manages every kiosk device. The JSON scopes
    # column is filtered in Python; a family has a handful of tokens.
    return [t for t in db.query(ApiToken).all() if KIOSK_SCOPE in (t.scopes or [])]


# --- Parent: device management ---

@router.get("/devices", response_model=List[KioskDevice])
def list_devices(db: Session = Depends(get_db), _parent: User = Depends(require_parent)):
    return sorted(_kiosk_tokens(db), key=lambda t: t.created_at, reverse=True)


@router.post("/devices", response_model=KioskDeviceCreated)
def create_device(
    body: KioskDeviceCreate,
    db: Session = Depends(get_db),
    parent: User = Depends(require_parent),
):
    full_token, token_hash = generate_api_token()
    row = ApiToken(
        user_id=parent.id,
        name=body.name.strip() or "Kiosk",
        token_hash=token_hash,
        token_prefix=get_token_prefix(full_token),
        scopes=[KIOSK_SCOPE],
        expires_at=None,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return KioskDeviceCreated(
        id=row.id, name=row.name, token_prefix=row.token_prefix,
        created_at=row.created_at, last_used=row.last_used, token=full_token,
    )


@router.delete("/devices/{device_id}")
def revoke_device(device_id: str, db: Session = Depends(get_db), _parent: User = Depends(require_parent)):
    row = next((t for t in _kiosk_tokens(db) if t.id == device_id), None)
    if row is None:
        raise HTTPException(status_code=404, detail="Kiosk device not found")
    db.delete(row)
    db.commit()
    return {"message": "Kiosk device removed"}


# --- Kiosk device ---

@router.get("/state", response_model=KioskState)
def kiosk_state(db: Session = Depends(get_db), device: ApiToken = Depends(require_kiosk)):
    kids = db.query(Kid).order_by(Kid.created_at.asc()).all()
    chores = db.query(Chore).all()
    claims = latest_claims_today(db, [k.id for k in kids])
    return KioskState(
        device_name=device.name,
        kids=[
            KioskKid(
                id=k.id, name=k.name, points=k.points or 0,
                chores=todays_chores_for_kid(db, k, chores=chores, claims_today=claims),
            )
            for k in kids
        ],
    )


@router.post("/claim", response_model=ChoreClaimResponse)
def kiosk_claim(
    body: KioskClaimRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _device: ApiToken = Depends(require_kiosk),
):
    claim, kid, chore = claim_chore_for_kid(db, body.chore_id, body.kid_id)
    schedule_claim_notifications(background_tasks, kid, chore)
    return claim


@router.delete("/session")
def end_session(db: Session = Depends(get_db), device: ApiToken = Depends(require_kiosk)):
    """The device leaves kiosk mode and revokes its own token."""
    db.delete(device)
    db.commit()
    return {"message": "Kiosk session ended"}
