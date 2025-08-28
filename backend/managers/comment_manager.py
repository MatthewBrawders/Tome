# managers/comment_manager.py
from typing import List, Optional, Dict, Any
from models.comment_model import CommentCreate, CommentOut
from databases.comment_repository import CommentsRepository  

def _normalize_id(doc: Dict[str, Any]) -> Dict[str, Any]:
    if not doc:
        raise ValueError("Empty document")
    d = dict(doc)
    if "_id" in d:
        d["id"] = str(d["_id"]); d.pop("_id", None); return d
    if "id" in d:
        d["id"] = str(d["id"]); return d
    if "inserted_id" in d:
        d["id"] = str(d["inserted_id"]); d.pop("inserted_id", None); return d
    return d

def _coerce_types(d: Dict[str, Any]) -> Dict[str, Any]:
    if "username" in d and d["username"] is not None and not isinstance(d["username"], str):
        d["username"] = str(d["username"])
    if "date_and_time" in d and d["date_and_time"] is not None:
        d["date_and_time"] = str(d["date_and_time"])
    return d

def _to_out(doc: Dict[str, Any]) -> CommentOut:
    d = _normalize_id(doc)
    d = _coerce_types(d)
    return CommentOut.model_validate({
        "username": d.get("username"),
        "comment": d.get("comment"),
        "date_and_time": d.get("date_and_time"),
    })

class CommentsManager:
    def __init__(self, uri: str, db_name: str, collection: str = "comments"):
        self._repo = CommentsRepository(uri, db_name, collection)

    async def connect(self): await self._repo.connect()
    async def close(self): await self._repo.close()

    async def create_comment(self, data: CommentCreate) -> CommentOut:
        doc = await self._repo.insert_one(data.model_dump())
        return _to_out(doc)

    async def get_comment(self, comment_id: str) -> Optional[CommentOut]:
        doc = await self._repo.find_one(comment_id)
        return _to_out(doc) if doc else None

    async def delete_comment(self, comment_id: str) -> bool:
        return await self._repo.delete_one(comment_id)

    async def list_comments_by_book(
        self, book_id: str, limit: int = 100, skip: int = 0, newest_first: bool = True
    ) -> List[CommentOut]:
        docs = await self._repo.find_by_book(book_id, limit=limit, skip=skip, newest_first=newest_first)
        return [_to_out(d) for d in docs]

    async def list_comments_by_user(
        self, username: str, limit: int = 100, skip: int = 0, newest_first: bool = True
    ) -> List[CommentOut]:
        docs = await self._repo.find_by_user(username, limit=limit, skip=skip, newest_first=newest_first)
        return [_to_out(d) for d in docs]

    async def delete_comments_by_book(self, book_id: str) -> int:
        return await self._repo.delete_by_book(book_id)
