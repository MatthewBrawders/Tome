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
                # Skip malformed docs rather than crashing the endpoint
                continue
        return out

    async def get_book(self, book_id: str) -> Optional[BookOut]:
        doc = await self._repo.find_one(book_id)
        return _to_out(doc) if doc else None

    async def create_book(self, data: BookCreate) -> BookOut:
        payload = data.model_dump()

        inserted = await self._repo.insert_one(payload)
        if "inserted_id" in inserted and "_id" not in inserted and "id" not in inserted:
            created_id = str(inserted["inserted_id"])
            doc = await self._repo.find_one(created_id)
        else:
            doc = inserted
        return _to_out(doc)

    async def update_book(self, book_id: str, data: BookUpdate) -> Optional[BookOut]:
        payload = data.model_dump(exclude_unset=True, exclude_none=True)
        if not payload:
            doc = await self._repo.find_one(book_id)
            return _to_out(doc) if doc else None

        doc = await self._repo.update_one(book_id, payload)
        return _to_out(doc) if doc else None

    async def delete_book(self, book_id: str) -> bool:
        return await self._repo.delete_one(book_id)
