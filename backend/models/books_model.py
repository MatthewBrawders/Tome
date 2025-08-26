# ===== books_model.py =====
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

# Shared fields
class BookBase(BaseModel):
  username: str  
  title: str
  author: Optional[str] = None
  year: Optional[int] = Field(default=None, ge=0)
  genre: Optional[str] = None
  image: Optional[str] = None
  review: Optional[str] = None

class BookCreate(BookBase):
  pass

class BookUpdate(BaseModel):
  username: Optional[str] = None
  title: Optional[str] = None
  author: Optional[str] = None
  year: Optional[int] = Field(default=None, ge=0)
  genre: Optional[str] = None
  image: Optional[str] = None
  review: Optional[str] = None

# Outgoing (what FastAPI returns)
class BookOut(BookBase):
  id: str = Field(..., description="Stringified ObjectId")
  model_config = ConfigDict(from_attributes=True, populate_by_name=True)
