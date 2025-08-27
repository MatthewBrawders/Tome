# ===== profile_model.py =====
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

class ProfileBase(BaseModel):
    username: str
    google_auth_id: Optional[str] = None

class ProfileCreate(ProfileBase):
    password: str

class ProfileUpdate(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    google_auth_id: Optional[str] = None

class ProfileOut(BaseModel):
    id: Optional[str] = None  
    username: str
    google_auth_id: Optional[str] = None  
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
