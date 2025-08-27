# ===== models/comment_model.py =====
from pydantic import BaseModel, ConfigDict

class CommentBase(BaseModel):
    username: str
    book_id: str
    comment: str
    date_and_time: str

class CommentCreate(CommentBase):
    pass

class CommentOut(BaseModel):
    username: str
    comment: str
    date_and_time: str
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
