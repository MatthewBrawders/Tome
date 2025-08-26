from typing import List, Optional
from bson import ObjectId
from models.books_model import BookCreate, BookUpdate, BookOut
from databases.books_repository import BooksRepository

def _normalize_id(doc: dict) -> dict:
    """
    Ensure `doc` has a string `id` field.
    Accepts docs with `_id`, `id`, or Motor-style `inserted_id`.
    """
    if not doc:
        raise ValueError("Empty document")
    d = dict(doc)

    # If the wrapper already gave us `_id`
    if "_id" in d:
        d["id"] = str(d["_id"])
        d.pop("_id", None)
        return d

    # Some wrappers rename to `id`
    if "id" in d:
        d["id"] = str(d["id"])
        return d

    # Motor insert_one result shape: {"inserted_id": ObjectId(...)}
    if "inserted_id" in d:
        d["id"] = str(d["inserted_id"])
        d.pop("inserted_id", None)
        return d

    # Nothing we can map -> caller should refetch or fix wrapper
    raise KeyError("Document missing identifier ('_id'/'id'/'inserted_id').")

def _to_out(doc: dict) -> BookOut:
    d = _normalize_id(doc)
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
            # Be forgiving: skip docs that truly lack an id, instead of 500ing the whole list
            try:
                out.append(_to_out(d))
            except KeyError:
                # Optional: log/print here if you want visibility
                continue
        return out

    async def get_book(self, book_id: str) -> Optional[BookOut]:
        doc = await self._repo.find_one(book_id)
        return _to_out(doc) if doc else None

    async def create_book(self, data: BookCreate) -> BookOut:
        inserted = await self._repo.insert_one(data.dict())
        # If the repo returned only an inserted_id, refetch the full doc
        if "inserted_id" in inserted and "_id" not in inserted and "id" not in inserted:
            created_id = str(inserted["inserted_id"])
            doc = await self._repo.find_one(created_id)
        else:
            doc = inserted
        return _to_out(doc)

    async def update_book(self, book_id: str, data: BookUpdate) -> Optional[BookOut]:
        payload = {k: v for k, v in data.dict(exclude_unset=True).items() if v is not None}
        doc = await self._repo.update_one(book_id, payload)
        return _to_out(doc) if doc else None

    async def delete_book(self, book_id: str) -> bool:
        return await self._repo.delete_one(book_id)
