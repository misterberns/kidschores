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

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import KIOSK_SCOPE, require_kiosk, require_parent
from ..models import ApiToken, Chore, ChoreClaim, Kid, KioskPairing, Parent, User
from ..schemas import ChoreApproveRequest, ChoreClaimResponse, MessageResponse, TodaysChoreResponse
from ..security import (
    KIOSK_PARENT_TICKET_TYPE,
    create_kiosk_parent_ticket,
    decode_token,
    generate_api_token,
    get_token_prefix,
    hash_pin,
    needs_rehash,
    verify_pin,
)
from ..services.chore_service import (
    adult_completions_today,
    adults_with_chores,
    claim_chore_for_kid,
    complete_adult_chore,
    latest_claims_today,
    todays_chores_for_adult,
    todays_chores_for_kid,
)
from .chores import approve_chore, disapprove_chore, schedule_claim_notifications

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


class KioskAdult(BaseModel):
    id: str
    name: str
    chores: List[TodaysChoreResponse]


class KioskState(BaseModel):
    device_name: str
    kids: List[KioskKid]
    adults: List[KioskAdult] = []
    # True when at least one parent has a PIN, i.e. approving on the kiosk is possible.
    parent_pin_set: bool = False


class KioskAdultDone(BaseModel):
    parent_id: str
    chore_id: str


class KioskUnlockRequest(BaseModel):
    pin: str = Field(min_length=1, max_length=12)


class KioskUnlocked(BaseModel):
    ticket: str
    parent_name: str
    expires_in: int  # seconds


class KioskPendingClaim(BaseModel):
    chore_id: str
    kid_id: str
    kid_name: str
    chore_name: str
    points: float
    claimed_at: datetime


class KioskDecision(BaseModel):
    chore_id: str
    kid_id: str


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
    adults = adults_with_chores(db, chores)
    done = adult_completions_today(db, [a.id for a in adults])
    return KioskState(
        device_name=device.name,
        kids=[
            KioskKid(
                id=k.id, name=k.name, points=k.points or 0,
                chores=todays_chores_for_kid(db, k, chores=chores, claims_today=claims),
            )
            for k in kids
        ],
        adults=[
            KioskAdult(id=a.id, name=a.name, chores=todays_chores_for_adult(a, chores, done))
            for a in adults
        ],
        parent_pin_set=db.query(Parent)
        .filter((Parent.pin_hash.isnot(None)) | (Parent.pin.isnot(None)))
        .first() is not None,
    )


@router.post("/adult-done", response_model=MessageResponse)
def kiosk_adult_done(
    body: KioskAdultDone,
    db: Session = Depends(get_db),
    _device: ApiToken = Depends(require_kiosk),
):
    """A grown-up marks their own assigned chore done: instant, no approval, no points."""
    complete_adult_chore(db, body.chore_id, body.parent_id)
    return {"message": "Done"}


# --- Parent approval on the kiosk (v0.19.0) ---

_UNLOCK_FAIL_MAX = 5
_UNLOCK_FAIL_WINDOW = 600  # seconds
_unlock_failures: dict = defaultdict(list)  # client ip -> failure timestamps
TICKET_MINUTES = 2


def _pin_matches(db: Session, parent: Parent, pin: str) -> bool:
    """Same checks as /auth/verify-pin, except a parent WITHOUT a PIN never matches."""
    if parent.pin_hash:
        ok = verify_pin(pin, parent.pin_hash)
        if ok and needs_rehash(parent.pin_hash):
            parent.pin_hash = hash_pin(pin)
            db.commit()
        return ok
    if parent.pin:
        ok = secrets.compare_digest(pin, parent.pin)
        if ok:  # migrate the legacy plaintext PIN, as /auth/verify-pin does
            parent.pin_hash = hash_pin(pin)
            parent.pin = None
            db.commit()
        return ok
    return False


@router.post("/parent/unlock", response_model=KioskUnlocked)
def kiosk_parent_unlock(
    body: KioskUnlockRequest,
    request: Request,
    db: Session = Depends(get_db),
    device: ApiToken = Depends(require_kiosk),
):
    """A parent types their PIN on the kiosk and gets a 2-minute approval ticket bound to
    this device. Only parents linked to an active, non-kid account qualify."""
    ip = request.client.host if request.client else "unknown"
    now = time.monotonic()
    _unlock_failures[ip] = [t for t in _unlock_failures[ip] if now - t < _UNLOCK_FAIL_WINDOW]
    if len(_unlock_failures[ip]) >= _UNLOCK_FAIL_MAX:
        raise HTTPException(status_code=429, detail="Too many wrong PINs. Wait a few minutes and try again.")

    for parent in db.query(Parent).filter(Parent.user_id.isnot(None)).all():
        if not (parent.pin_hash or parent.pin) or not _pin_matches(db, parent, body.pin):
            continue
        user = db.query(User).filter(User.id == parent.user_id).first()
        if user is None or not user.is_active or db.query(Kid).filter(Kid.user_id == user.id).first():
            continue
        ticket = create_kiosk_parent_ticket(user.id, device.id, user.token_version or 0, TICKET_MINUTES)
        return KioskUnlocked(ticket=ticket, parent_name=parent.name, expires_in=TICKET_MINUTES * 60)

    _unlock_failures[ip].append(time.monotonic())
    raise HTTPException(status_code=401, detail="That PIN didn't match a parent.")


def _ticket_parent(db: Session, device: ApiToken, ticket: Optional[str]) -> User:
    payload = decode_token(ticket) if ticket else None
    if not payload or payload.get("type") != KIOSK_PARENT_TICKET_TYPE or payload.get("dev") != device.id:
        raise HTTPException(status_code=401, detail="Parent PIN needed again")
    user = db.query(User).filter(User.id == payload.get("sub")).first()
    if (
        user is None
        or not user.is_active
        or payload.get("tv", 0) != (user.token_version or 0)
        or db.query(Kid).filter(Kid.user_id == user.id).first() is not None
    ):
        raise HTTPException(status_code=401, detail="Parent PIN needed again")
    return user


@router.get("/parent/pending", response_model=List[KioskPendingClaim])
def kiosk_parent_pending(
    db: Session = Depends(get_db),
    device: ApiToken = Depends(require_kiosk),
    x_kiosk_parent: Optional[str] = Header(default=None),
):
    """Kids' chore claims waiting for a parent (reward redemptions stay in the parent app)."""
    _ticket_parent(db, device, x_kiosk_parent)
    rows = (
        db.query(ChoreClaim)
        .filter(ChoreClaim.status == "claimed")
        .order_by(ChoreClaim.claimed_at.asc())
        .all()
    )
    kids = {k.id: k for k in db.query(Kid).all()}
    chores = {c.id: c for c in db.query(Chore).all()}
    out = []
    for r in rows:
        kid, chore = kids.get(r.kid_id), chores.get(r.chore_id)
        if kid is None or chore is None:
            continue
        out.append(KioskPendingClaim(
            chore_id=chore.id, kid_id=kid.id, kid_name=kid.name, chore_name=chore.name,
            points=round(chore.default_points * (kid.points_multiplier or 1)),
            claimed_at=r.claimed_at,
        ))
    return out


@router.post("/parent/approve", response_model=ChoreClaimResponse)
def kiosk_parent_approve(
    body: KioskDecision,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    device: ApiToken = Depends(require_kiosk),
    x_kiosk_parent: Optional[str] = Header(default=None),
):
    """Approve through the SAME function as the parent app (points, streaks, badges, push)."""
    user = _ticket_parent(db, device, x_kiosk_parent)
    return approve_chore(body.chore_id, ChoreApproveRequest(kid_id=body.kid_id), background_tasks, db, user)


@router.post("/parent/reject", response_model=MessageResponse)
def kiosk_parent_reject(
    body: KioskDecision,
    db: Session = Depends(get_db),
    device: ApiToken = Depends(require_kiosk),
    x_kiosk_parent: Optional[str] = Header(default=None),
):
    user = _ticket_parent(db, device, x_kiosk_parent)
    return disapprove_chore(body.chore_id, ChoreApproveRequest(kid_id=body.kid_id), db, user)


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
