from pydantic import BaseModel, Field, ConfigDict
from typing import Optional

class BookBase(BaseModel):
    title: str
    author: str
    year: int
    genre: Optional[str] = None

class BookCreate(BookBase):
    pass

class BookUpdate(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    year: Optional[int] = None
    genre: Optional[str] = None

class BookOut(BookBase):
    id: str = Field(..., description="Stringified ObjectId")
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
