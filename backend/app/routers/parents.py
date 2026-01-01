"""Parents API endpoints."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Parent
from ..schemas import ParentCreate, ParentResponse

router = APIRouter()


@router.get("/", response_model=List[ParentResponse])
def list_parents(db: Session = Depends(get_db)):
    """List all parents."""
    return db.query(Parent).all()


@router.post("/", response_model=ParentResponse)
def create_parent(parent: ParentCreate, db: Session = Depends(get_db)):
    """Create a new parent."""
    db_parent = Parent(**parent.model_dump())
    db.add(db_parent)
    db.commit()
    db.refresh(db_parent)
    return db_parent


@router.get("/{parent_id}", response_model=ParentResponse)
def get_parent(parent_id: str, db: Session = Depends(get_db)):
    """Get parent by ID."""
    parent = db.query(Parent).filter(Parent.id == parent_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")
    return parent


@router.put("/{parent_id}", response_model=ParentResponse)
def update_parent(parent_id: str, parent_update: ParentCreate, db: Session = Depends(get_db)):
    """Update parent."""
    parent = db.query(Parent).filter(Parent.id == parent_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")

    update_data = parent_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(parent, field, value)

    db.commit()
    db.refresh(parent)
    return parent


@router.delete("/{parent_id}")
def delete_parent(parent_id: str, db: Session = Depends(get_db)):
    """Delete parent."""
    parent = db.query(Parent).filter(Parent.id == parent_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")

    db.delete(parent)
    db.commit()
    return {"message": "Parent deleted"}


@router.post("/{parent_id}/verify-pin")
def verify_pin(parent_id: str, pin: str, db: Session = Depends(get_db)):
    """Verify parent PIN for approval actions."""
    parent = db.query(Parent).filter(Parent.id == parent_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")

    if not parent.pin:
        return {"valid": True, "message": "No PIN set"}

    if parent.pin == pin:
        return {"valid": True, "message": "PIN verified"}

    raise HTTPException(status_code=401, detail="Invalid PIN")
