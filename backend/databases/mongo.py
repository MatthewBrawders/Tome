from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorCollection
from bson import ObjectId
from typing import Any, Dict

# Helpers to convert Mongo docs to JSON-friendly dicts
def _serialize(doc: Dict[str, Any]) -> Dict[str, Any]:
    if not doc:
        return doc
    doc = dict(doc)
    _id = doc.pop("_id", None)
    if isinstance(_id, ObjectId):
        doc["id"] = str(_id)
    elif _id is not None:
        doc["id"] = _id
    return doc

def to_object_id(id_str: str) -> ObjectId:
    return ObjectId(id_str)

class Mongo:
    def __init__(self, uri: str, db_name: str, collection: str):
        self._uri = uri
        self._db_name = db_name
        self._collection_name = collection
        self.client: AsyncIOMotorClient | None = None
        self.collection: AsyncIOMotorCollection | None = None

    async def connect(self):
        self.client = AsyncIOMotorClient(self._uri)
        db = self.client[self._db_name]
        self.collection = db[self._collection_name]

    async def close(self):
        if self.client:
            self.client.close()

    # Generic helpers you can reuse if you add more managers later
    async def find_all(self):
        assert self.collection is not None
        cursor = self.collection.find({})
        return [_serialize(doc) async for doc in cursor]

    async def find_one(self, oid: ObjectId):
        assert self.collection is not None
        doc = await self.collection.find_one({"_id": oid})
        return _serialize(doc) if doc else None

    async def insert_one(self, data: Dict[str, Any]):
        assert self.collection is not None
        res = await self.collection.insert_one(data)
        doc = await self.collection.find_one({"_id": res.inserted_id})
        return _serialize(doc)

    async def update_one(self, oid: ObjectId, data: Dict[str, Any]):
        assert self.collection is not None
        await self.collection.update_one({"_id": oid}, {"$set": data})
        doc = await self.collection.find_one({"_id": oid})
        return _serialize(doc) if doc else None

    async def delete_one(self, oid: ObjectId) -> bool:
        assert self.collection is not None
        res = await self.collection.delete_one({"_id": oid})
        return res.deleted_count == 1
