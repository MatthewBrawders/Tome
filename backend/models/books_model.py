# ===== books_model.py =====
from typing import Optional
from pydantic import BaseModel, Field
from pydantic.config import ConfigDict

# Shared fields
class BookBase(BaseModel):
    title: str
    author: Optional[str] = None
    year: Optional[int] = None
    genre: Optional[str] = None
    image: Optional[str] = None
    review: Optional[str] = None

class BookCreate(BookBase):
    pass

class BookUpdate(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    year: Optional[int] = None
    genre: Optional[str] = None
    image: Optional[str] = None
    review: Optional[str] = None

# Outgoing (what FastAPI returns)
class BookOut(BookBase):
    id: str = Field(..., description="Stringified ObjectId")
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)