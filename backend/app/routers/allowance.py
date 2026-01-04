"""Allowance management API endpoints."""
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ..database import get_db
from ..models import Kid, AllowanceSettings, AllowancePayout

router = APIRouter()


# Request/Response models
class AllowanceSettingsUpdate(BaseModel):
    """Update allowance settings."""
    points_per_dollar: Optional[int] = None
    auto_payout: Optional[bool] = None
    payout_day: Optional[int] = None  # 0=Sunday, 6=Saturday
    minimum_payout: Optional[float] = None


class AllowanceSettingsResponse(BaseModel):
    """Allowance settings response."""
    id: str
    kid_id: str
    points_per_dollar: int
    auto_payout: bool
    payout_day: int
    minimum_payout: float
    # Computed fields
    kid_points: float
    dollar_equivalent: float

    class Config:
        from_attributes = True


class PayoutRequest(BaseModel):
    """Request a payout."""
    points_to_convert: int
    payout_method: str = "cash"  # cash, bank, gift_card
    notes: Optional[str] = None


class PayoutResponse(BaseModel):
    """Payout record response."""
    id: str
    kid_id: str
    points_converted: int
    dollar_amount: float
    payout_method: str
    status: str
    notes: Optional[str]
    requested_at: datetime
    paid_at: Optional[datetime]
    paid_by: Optional[str]

    class Config:
        from_attributes = True


class AllowanceSummary(BaseModel):
    """Summary of allowance for a kid."""
    kid_id: str
    kid_name: str
    current_points: float
    dollar_equivalent: float
    points_per_dollar: int
    pending_payouts: int
    pending_amount: float
    total_paid: float
    total_paid_count: int


@router.get("/settings/{kid_id}", response_model=AllowanceSettingsResponse)
def get_allowance_settings(kid_id: str, db: Session = Depends(get_db)):
    """Get allowance settings for a kid."""
    kid = db.query(Kid).filter(Kid.id == kid_id).first()
    if not kid:
        raise HTTPException(status_code=404, detail="Kid not found")

    # Get or create settings
    settings = db.query(AllowanceSettings).filter(
        AllowanceSettings.kid_id == kid_id
    ).first()

    if not settings:
        settings = AllowanceSettings(kid_id=kid_id)
        db.add(settings)
        db.commit()
        db.refresh(settings)

    return AllowanceSettingsResponse(
        id=settings.id,
        kid_id=settings.kid_id,
        points_per_dollar=settings.points_per_dollar,
        auto_payout=settings.auto_payout,
        payout_day=settings.payout_day,
        minimum_payout=settings.minimum_payout,
        kid_points=kid.points,
        dollar_equivalent=kid.points / settings.points_per_dollar,
    )


@router.put("/settings/{kid_id}", response_model=AllowanceSettingsResponse)
def update_allowance_settings(
    kid_id: str,
    update: AllowanceSettingsUpdate,
    db: Session = Depends(get_db)
):
    """Update allowance settings for a kid."""
    kid = db.query(Kid).filter(Kid.id == kid_id).first()
    if not kid:
        raise HTTPException(status_code=404, detail="Kid not found")

    settings = db.query(AllowanceSettings).filter(
        AllowanceSettings.kid_id == kid_id
    ).first()

    if not settings:
        settings = AllowanceSettings(kid_id=kid_id)
        db.add(settings)

    # Apply updates
    update_data = update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(settings, field, value)

    db.commit()
    db.refresh(settings)

    return AllowanceSettingsResponse(
        id=settings.id,
        kid_id=settings.kid_id,
        points_per_dollar=settings.points_per_dollar,
        auto_payout=settings.auto_payout,
        payout_day=settings.payout_day,
        minimum_payout=settings.minimum_payout,
        kid_points=kid.points,
        dollar_equivalent=kid.points / settings.points_per_dollar,
    )


@router.post("/convert/{kid_id}", response_model=PayoutResponse)
def request_payout(
    kid_id: str,
    request: PayoutRequest,
    db: Session = Depends(get_db)
):
    """Request a payout (convert points to money)."""
    kid = db.query(Kid).filter(Kid.id == kid_id).first()
    if not kid:
        raise HTTPException(status_code=404, detail="Kid not found")

    # Get settings
    settings = db.query(AllowanceSettings).filter(
        AllowanceSettings.kid_id == kid_id
    ).first()

    if not settings:
        settings = AllowanceSettings(kid_id=kid_id)
        db.add(settings)
        db.commit()
        db.refresh(settings)

    # Calculate dollar amount
    dollar_amount = request.points_to_convert / settings.points_per_dollar

    # Validate
    if request.points_to_convert > kid.points:
        raise HTTPException(
            status_code=400,
            detail=f"Not enough points. You have {kid.points:.0f} points."
        )

    if dollar_amount < settings.minimum_payout:
        raise HTTPException(
            status_code=400,
            detail=f"Minimum payout is ${settings.minimum_payout:.2f}"
        )

    # Deduct points immediately
    kid.points -= request.points_to_convert

    # Create payout record
    payout = AllowancePayout(
        kid_id=kid_id,
        points_converted=request.points_to_convert,
        dollar_amount=dollar_amount,
        payout_method=request.payout_method,
        status="pending",
        notes=request.notes,
    )
    db.add(payout)
    db.commit()
    db.refresh(payout)

    return PayoutResponse(
        id=payout.id,
        kid_id=payout.kid_id,
        points_converted=payout.points_converted,
        dollar_amount=payout.dollar_amount,
        payout_method=payout.payout_method,
        status=payout.status,
        notes=payout.notes,
        requested_at=payout.requested_at,
        paid_at=payout.paid_at,
        paid_by=payout.paid_by,
    )


@router.get("/payouts/{kid_id}", response_model=List[PayoutResponse])
def get_payouts(
    kid_id: str,
    status: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Get payout history for a kid."""
    query = db.query(AllowancePayout).filter(AllowancePayout.kid_id == kid_id)

    if status:
        query = query.filter(AllowancePayout.status == status)

    payouts = query.order_by(AllowancePayout.requested_at.desc()).limit(limit).all()

    return [
        PayoutResponse(
            id=p.id,
            kid_id=p.kid_id,
            points_converted=p.points_converted,
            dollar_amount=p.dollar_amount,
            payout_method=p.payout_method,
            status=p.status,
            notes=p.notes,
            requested_at=p.requested_at,
            paid_at=p.paid_at,
            paid_by=p.paid_by,
        )
        for p in payouts
    ]


@router.get("/pending", response_model=List[PayoutResponse])
def get_all_pending_payouts(db: Session = Depends(get_db)):
    """Get all pending payouts across all kids."""
    payouts = db.query(AllowancePayout).filter(
        AllowancePayout.status == "pending"
    ).order_by(AllowancePayout.requested_at.asc()).all()

    return [
        PayoutResponse(
            id=p.id,
            kid_id=p.kid_id,
            points_converted=p.points_converted,
            dollar_amount=p.dollar_amount,
            payout_method=p.payout_method,
            status=p.status,
            notes=p.notes,
            requested_at=p.requested_at,
            paid_at=p.paid_at,
            paid_by=p.paid_by,
        )
        for p in payouts
    ]


class MarkPaidRequest(BaseModel):
    """Mark payout as paid."""
    paid_by: str
    notes: Optional[str] = None


@router.post("/payouts/{payout_id}/pay", response_model=PayoutResponse)
def mark_payout_paid(
    payout_id: str,
    request: MarkPaidRequest,
    db: Session = Depends(get_db)
):
    """Mark a payout as paid."""
    payout = db.query(AllowancePayout).filter(
        AllowancePayout.id == payout_id
    ).first()

    if not payout:
        raise HTTPException(status_code=404, detail="Payout not found")

    if payout.status != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Payout is already {payout.status}"
        )

    payout.status = "paid"
    payout.paid_at = datetime.utcnow()
    payout.paid_by = request.paid_by
    if request.notes:
        payout.notes = (payout.notes or "") + f"\nPaid: {request.notes}"

    db.commit()
    db.refresh(payout)

    return PayoutResponse(
        id=payout.id,
        kid_id=payout.kid_id,
        points_converted=payout.points_converted,
        dollar_amount=payout.dollar_amount,
        payout_method=payout.payout_method,
        status=payout.status,
        notes=payout.notes,
        requested_at=payout.requested_at,
        paid_at=payout.paid_at,
        paid_by=payout.paid_by,
    )


@router.post("/payouts/{payout_id}/cancel", response_model=PayoutResponse)
def cancel_payout(payout_id: str, db: Session = Depends(get_db)):
    """Cancel a pending payout and refund points."""
    payout = db.query(AllowancePayout).filter(
        AllowancePayout.id == payout_id
    ).first()

    if not payout:
        raise HTTPException(status_code=404, detail="Payout not found")

    if payout.status != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot cancel payout that is already {payout.status}"
        )

    # Refund points
    kid = db.query(Kid).filter(Kid.id == payout.kid_id).first()
    if kid:
        kid.points += payout.points_converted

    payout.status = "cancelled"
    db.commit()
    db.refresh(payout)

    return PayoutResponse(
        id=payout.id,
        kid_id=payout.kid_id,
        points_converted=payout.points_converted,
        dollar_amount=payout.dollar_amount,
        payout_method=payout.payout_method,
        status=payout.status,
        notes=payout.notes,
        requested_at=payout.requested_at,
        paid_at=payout.paid_at,
        paid_by=payout.paid_by,
    )


@router.get("/summary/{kid_id}", response_model=AllowanceSummary)
def get_allowance_summary(kid_id: str, db: Session = Depends(get_db)):
    """Get allowance summary for a kid."""
    kid = db.query(Kid).filter(Kid.id == kid_id).first()
    if not kid:
        raise HTTPException(status_code=404, detail="Kid not found")

    settings = db.query(AllowanceSettings).filter(
        AllowanceSettings.kid_id == kid_id
    ).first()

    points_per_dollar = settings.points_per_dollar if settings else 100

    # Calculate pending payouts
    pending_payouts = db.query(AllowancePayout).filter(
        AllowancePayout.kid_id == kid_id,
        AllowancePayout.status == "pending"
    ).all()

    pending_count = len(pending_payouts)
    pending_amount = sum(p.dollar_amount for p in pending_payouts)

    # Calculate total paid
    paid_payouts = db.query(AllowancePayout).filter(
        AllowancePayout.kid_id == kid_id,
        AllowancePayout.status == "paid"
    ).all()

    total_paid = sum(p.dollar_amount for p in paid_payouts)
    total_paid_count = len(paid_payouts)

    return AllowanceSummary(
        kid_id=kid_id,
        kid_name=kid.name,
        current_points=kid.points,
        dollar_equivalent=kid.points / points_per_dollar,
        points_per_dollar=points_per_dollar,
        pending_payouts=pending_count,
        pending_amount=pending_amount,
        total_paid=total_paid,
        total_paid_count=total_paid_count,
    )
