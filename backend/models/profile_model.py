# ===== profile_model.py =====
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

# Shared fields (data that belongs on the profile itself)
class ProfileBase(BaseModel):
  username: str
  google_auth_id: Optional[str] = None

# For creating a profile: include password (hash it server-side)
class ProfileCreate(ProfileBase):
  password: str

# For updates (optional fields)
class ProfileUpdate(BaseModel):
  username: Optional[str] = None
  password: Optional[str] = None
  google_auth_id: Optional[str] = None

# Outgoing (what FastAPI returns) — ONLY username 
class ProfileOut(BaseModel):
  username: str
  model_config = ConfigDict(from_attributes=True, populate_by_name=True)
