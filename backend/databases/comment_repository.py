# ===== databases/comments_repository.py =====
from typing import Any, Dict, List, Optional
from bson import ObjectId
from databases.mongo import Mongo, to_object_id

def _serialize(doc: Dict[str, Any]) -> Dict[str, Any]:
    if not doc:
        return doc
    d = dict(doc)
    _id = d.pop("_id", None)
    if _id is not None:
        d["id"] = str(_id)
    return d

class CommentsRepository:
    def __init__(self, uri: str, db_name: str, collection: str = "comments"):
        self._mongo = Mongo(uri, db_name, collection)

    async def connect(self):
        await self._mongo.connect()

    async def close(self):
        await self._mongo.close()

    async def find_all(self) -> List[Dict[str, Any]]:
        return await self._mongo.find_all()

    async def find_one(self, comment_id: str) -> Optional[Dict[str, Any]]:
        oid: ObjectId = to_object_id(comment_id)
        return await self._mongo.find_one(oid)

    async def insert_one(self, data: Dict[str, Any]) -> Dict[str, Any]:
        return await self._mongo.insert_one(data)

    async def update_one(self, comment_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        oid: ObjectId = to_object_id(comment_id)
        return await self._mongo.update_one(oid, data)

    async def delete_one(self, comment_id: str) -> bool:
        oid: ObjectId = to_object_id(comment_id)
        return await self._mongo.delete_one(oid)

    async def find_by_book(self, book_id: str, *, limit: int = 100, skip: int = 0, newest_first: bool = True) -> List[Dict[str, Any]]:
        assert self._mongo.collection is not None
        sort_dir = -1 if newest_first else 1
        cursor = (
            self._mongo.collection
            .find({"book_id": book_id})
            .sort("date_and_time", sort_dir)
            .skip(skip)
            .limit(limit)
        )
        return [_serialize(doc) async for doc in cursor]


    async def find_by_user(self, username: str, *, limit: int = 100, skip: int = 0, newest_first: bool = True) -> List[Dict[str, Any]]:
        assert self._mongo.collection is not None
        sort_dir = -1 if newest_first else 1
        cursor = (
            self._mongo.collection
            .find({"username": username})
            .sort("date_and_time", sort_dir)
            .skip(skip)
            .limit(limit)
        )
        return [_serialize(doc) async for doc in cursor]
    
    async def delete_by_book(self, book_id: str) -> int:
        assert self._mongo.collection is not None
        res = await self._mongo.collection.delete_many({"book_id": book_id})
        return res.deleted_count

