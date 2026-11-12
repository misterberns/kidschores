"""Kiosk / shared-tablet mode (v0.18.0).

Two audiences:
- Parents manage kiosk devices (`/devices`): mint a claim-only token, list, revoke.
- A kiosk device, holding only that token, reads today's chores for every kid and
  claims one on a kid's behalf (`/state`, `/claim`), or ends its own session.

A device can also be paired with a one-time code (v0.18.2): a parent creates the code
on their own device (`/pairings`), the kiosk redeems it (`/pair`, no sign-in), so no
parent session or password ever touches the shared tablet. That is also the only way
to set up a kiosk inside another site's frame (e.g. a Home Assistant dashboard), where
Google sign-in refuses to run.

A kiosk token carries scopes=["kiosk"]. `get_current_user` refuses scoped tokens, so
the token reaches nothing outside this router; here it authenticates through
`require_kiosk`. It can claim and nothing else: no approve, no rewards, no settings.
"""
import hashlib
import secrets
import time
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import KIOSK_SCOPE, require_kiosk, require_parent
from ..models import ApiToken, Chore, Kid, KioskPairing, User
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


class KioskPairingCreated(BaseModel):
    name: str
    code: str  # shown once, formatted XXXX-XXXX
    expires_at: datetime


class KioskPairRequest(BaseModel):
    code: str = Field(min_length=1, max_length=32)


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


# --- Pairing codes ---

PAIRING_TTL = timedelta(minutes=10)
# No 0/O, 1/I/L: a code is read off one screen and typed on another.
_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
_CODE_LEN = 8  # 31^8 ≈ 8.5e11 codes; with the limiter below, guessing one is not practical
_PAIR_FAIL_MAX = 10
_PAIR_FAIL_WINDOW = 600  # seconds
_pair_failures: dict = defaultdict(list)  # client ip -> failure timestamps (single-process, like auth.py)


def _normalize_code(code: str) -> str:
    return "".join(ch for ch in code.upper() if ch.isalnum())


def _hash_code(code: str) -> str:
    return hashlib.sha256(_normalize_code(code).encode()).hexdigest()


def _utc(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)  # SQLite returns naive UTC


def _check_pair_rate_limit(ip: str) -> None:
    now = time.monotonic()
    _pair_failures[ip] = [t for t in _pair_failures[ip] if now - t < _PAIR_FAIL_WINDOW]
    if len(_pair_failures[ip]) >= _PAIR_FAIL_MAX:
        raise HTTPException(status_code=429, detail="Too many wrong codes. Wait a few minutes and try again.")


def _mint_kiosk_token(db: Session, user_id: str, name: str) -> KioskDeviceCreated:
    full_token, token_hash = generate_api_token()
    row = ApiToken(
        user_id=user_id,
        name=name.strip() or "Kiosk",
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
    return _mint_kiosk_token(db, parent.id, body.name)


@router.post("/pairings", response_model=KioskPairingCreated)
def create_pairing(
    body: KioskDeviceCreate,
    db: Session = Depends(get_db),
    parent: User = Depends(require_parent),
):
    """A one-time code the kiosk device types in (POST /pair). Shown once."""
    now = datetime.now(timezone.utc)
    # Housekeeping: used or expired codes are never needed again.
    for old in db.query(KioskPairing).all():
        if old.used_at is not None or _utc(old.expires_at) < now:
            db.delete(old)
    code = "".join(secrets.choice(_CODE_ALPHABET) for _ in range(_CODE_LEN))
    row = KioskPairing(
        created_by=parent.id,
        name=body.name.strip() or "Kiosk",
        code_hash=_hash_code(code),
        expires_at=now + PAIRING_TTL,
    )
    db.add(row)
    db.commit()
    return KioskPairingCreated(name=row.name, code=f"{code[:4]}-{code[4:]}", expires_at=row.expires_at)


@router.post("/pair", response_model=KioskDeviceCreated)
def redeem_pairing(body: KioskPairRequest, request: Request, db: Session = Depends(get_db)):
    """Anonymous: a device exchanges a valid, unexpired, unused code for a kiosk token."""
    ip = request.client.host if request.client else "unknown"
    _check_pair_rate_limit(ip)
    now = datetime.now(timezone.utc)
    row = db.query(KioskPairing).filter(KioskPairing.code_hash == _hash_code(body.code)).first()
    owner = db.query(User).filter(User.id == row.created_by).first() if row else None
    if (
        row is None
        or row.used_at is not None
        or _utc(row.expires_at) < now
        or owner is None
        or not owner.is_active
    ):
        _pair_failures[ip].append(time.monotonic())
        raise HTTPException(status_code=400, detail="That code isn't valid or has expired.")
    # Single use even under concurrent redemption: only one UPDATE can flip used_at.
    claimed = (
        db.query(KioskPairing)
        .filter(KioskPairing.id == row.id, KioskPairing.used_at.is_(None))
        .update({KioskPairing.used_at: now}, synchronize_session=False)
    )
    db.commit()
    if claimed != 1:
        raise HTTPException(status_code=400, detail="That code isn't valid or has expired.")
    return _mint_kiosk_token(db, owner.id, row.name)


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
