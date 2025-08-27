# ===== managers/books_manager.py =====
from typing import List, Optional, Dict, Any
from models.books_model import BookCreate, BookUpdate, BookOut
from databases.books_repository import BooksRepository

def _normalize_id(doc: Dict[str, Any]) -> Dict[str, Any]:
    if not doc:
        raise ValueError("Empty document")
    d = dict(doc)
    if "_id" in d:
        d["id"] = str(d["_id"])
        d.pop("_id", None)
        return d
    if "id" in d:
        d["id"] = str(d["id"])
        return d
    if "inserted_id" in d:
        d["id"] = str(d["inserted_id"])
        d.pop("inserted_id", None)
        return d
    raise KeyError("Document missing identifier ('_id'/'id'/'inserted_id').")

def _coerce_types(d: Dict[str, Any]) -> Dict[str, Any]:
    if "year" in d and isinstance(d["year"], str) and d["year"].isdigit():
        d["year"] = int(d["year"])
    if "username" in d and d["username"] is not None and not isinstance(d["username"], str):
        d["username"] = str(d["username"])
    return d

def _to_out(doc: Dict[str, Any]) -> BookOut:
    d = _normalize_id(doc)
    d = _coerce_types(d)
    return BookOut.model_validate(d)

class BooksManager:
    def __init__(self, uri: str, db_name: str, collection: str):
        self._repo = BooksRepository(uri, db_name, collection)

    async def connect(self):
        await self._repo.connect()

    async def close(self):
        await self._repo.close()

    async def list_books(self) -> List[BookOut]:
        docs = await self._repo.find_all()
        out: List[BookOut] = []
        for d in docs:
            try:
                out.append(_to_out(d))
            except KeyError:
                continue
        return out

    async def list_books_by_user(self, username: str) -> List[BookOut]:
        docs = await self._repo.find_by_user(username)
        out: List[BookOut] = []
        for d in docs:
            try:
                out.append(_to_out(d))
            except KeyError:
                continue
        return out

    async def get_book(self, book_id: str) -> Optional[BookOut]:
        doc = await self._repo.find_one(book_id)
        return _to_out(doc) if doc else None

    async def create_book(self, data: BookCreate) -> BookOut:
        payload = data.model_dump()
        payload.setdefault("views", 0)  # default counter
        doc = await self._repo.insert_one(payload)
        return _to_out(doc)

    async def update_book(self, book_id: str, payload: dict):
        payload = {k: v for k, v in payload.items() if k != "views"}  # guard the counter
        return await self._repo.update_fields(book_id, payload)

    async def delete_book(self, book_id: str) -> bool:
        return await self._repo.delete_one(book_id)

    async def increment_and_get(self, book_id: str):
        return await self._repo.find_one_and_inc_views(book_id)
