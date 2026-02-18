"""Chore category API endpoints."""
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

logger = logging.getLogger(__name__)

from ..database import get_db
from ..deps import require_auth, require_admin
from ..models import ChoreCategory, Chore, User

router = APIRouter()


# Request/Response models
class CategoryCreate(BaseModel):
    """Create a new category."""
    name: str
    icon: str = "📁"
    color: str = "#6366f1"
    sort_order: Optional[int] = None


class CategoryUpdate(BaseModel):
    """Update an existing category."""
    name: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    sort_order: Optional[int] = None


class CategoryResponse(BaseModel):
    """Category response model."""
    id: str
    name: str
    icon: str
    color: str
    sort_order: int
    chore_count: Optional[int] = None

    class Config:
        from_attributes = True


# Predefined categories with icons
PREDEFINED_CATEGORIES = [
    {"name": "Bedroom", "icon": "🛏️", "color": "#8b5cf6"},
    {"name": "Kitchen", "icon": "🍽️", "color": "#f59e0b"},
    {"name": "Bathroom", "icon": "🚿", "color": "#3b82f6"},
    {"name": "Living Room", "icon": "🛋️", "color": "#10b981"},
    {"name": "Outdoor", "icon": "🌳", "color": "#22c55e"},
    {"name": "School", "icon": "📚", "color": "#6366f1"},
    {"name": "Pet Care", "icon": "🐕", "color": "#ec4899"},
    {"name": "Laundry", "icon": "👕", "color": "#14b8a6"},
]


@router.get("", response_model=List[CategoryResponse])
@router.get("/", response_model=List[CategoryResponse], include_in_schema=False)
def list_categories(db: Session = Depends(get_db), _user: User = Depends(require_auth)):
    """List all categories with chore counts."""
    categories = db.query(ChoreCategory).order_by(ChoreCategory.sort_order).all()

    result = []
    for cat in categories:
        # Count chores in this category
        chore_count = db.query(Chore).filter(Chore.category_id == cat.id).count()
        result.append(CategoryResponse(
            id=cat.id,
            name=cat.name,
            icon=cat.icon,
            color=cat.color,
            sort_order=cat.sort_order,
            chore_count=chore_count,
        ))

    return result


@router.post("", response_model=CategoryResponse)
@router.post("/", response_model=CategoryResponse, include_in_schema=False)
def create_category(category: CategoryCreate, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    """Create a new category."""
    # If sort_order not provided, put at end
    if category.sort_order is None:
        max_order = db.query(ChoreCategory.sort_order).order_by(
            ChoreCategory.sort_order.desc()
        ).first()
        sort_order = (max_order[0] + 1) if max_order else 0
    else:
        sort_order = category.sort_order

    db_category = ChoreCategory(
        name=category.name,
        icon=category.icon,
        color=category.color,
        sort_order=sort_order,
    )
    db.add(db_category)
    db.commit()
    db.refresh(db_category)

    return CategoryResponse(
        id=db_category.id,
        name=db_category.name,
        icon=db_category.icon,
        color=db_category.color,
        sort_order=db_category.sort_order,
        chore_count=0,
    )


@router.get("/predefined")
def get_predefined_categories(_user: User = Depends(require_auth)):
    """Get list of predefined category templates."""
    return PREDEFINED_CATEGORIES


@router.post("/seed-defaults")
def seed_default_categories(db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    """Seed the database with predefined categories."""
    created = []
    for i, cat_data in enumerate(PREDEFINED_CATEGORIES):
        # Check if category already exists
        existing = db.query(ChoreCategory).filter(
            ChoreCategory.name == cat_data["name"]
        ).first()
        if not existing:
            category = ChoreCategory(
                name=cat_data["name"],
                icon=cat_data["icon"],
                color=cat_data["color"],
                sort_order=i,
            )
            db.add(category)
            created.append(cat_data["name"])

    db.commit()
    return {"created": created, "count": len(created)}


@router.get("/{category_id}", response_model=CategoryResponse)
def get_category(category_id: str, db: Session = Depends(get_db), _user: User = Depends(require_auth)):
    """Get a category by ID."""
    category = db.query(ChoreCategory).filter(ChoreCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    chore_count = db.query(Chore).filter(Chore.category_id == category.id).count()

    return CategoryResponse(
        id=category.id,
        name=category.name,
        icon=category.icon,
        color=category.color,
        sort_order=category.sort_order,
        chore_count=chore_count,
    )


@router.put("/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: str,
    category_update: CategoryUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Update a category."""
    category = db.query(ChoreCategory).filter(ChoreCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    update_data = category_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category, field, value)

    db.commit()
    db.refresh(category)

    chore_count = db.query(Chore).filter(Chore.category_id == category.id).count()

    return CategoryResponse(
        id=category.id,
        name=category.name,
        icon=category.icon,
        color=category.color,
        sort_order=category.sort_order,
        chore_count=chore_count,
    )


@router.delete("/{category_id}")
def delete_category(category_id: str, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    """Delete a category. Chores will have their category set to null."""
    category = db.query(ChoreCategory).filter(ChoreCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    # Remove category from chores
    db.query(Chore).filter(Chore.category_id == category_id).update(
        {Chore.category_id: None}
    )

    db.delete(category)
    db.commit()

    return {"message": "Category deleted"}


@router.put("/{category_id}/reorder")
def reorder_category(
    category_id: str,
    new_order: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Reorder a category."""
    category = db.query(ChoreCategory).filter(ChoreCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    old_order = category.sort_order

    # Shift other categories
    if new_order < old_order:
        # Moving up - shift others down
        db.query(ChoreCategory).filter(
            ChoreCategory.sort_order >= new_order,
            ChoreCategory.sort_order < old_order,
            ChoreCategory.id != category_id
        ).update({ChoreCategory.sort_order: ChoreCategory.sort_order + 1})
    else:
        # Moving down - shift others up
        db.query(ChoreCategory).filter(
            ChoreCategory.sort_order > old_order,
            ChoreCategory.sort_order <= new_order,
            ChoreCategory.id != category_id
        ).update({ChoreCategory.sort_order: ChoreCategory.sort_order - 1})

    category.sort_order = new_order
    db.commit()

    return {"message": "Category reordered"}
