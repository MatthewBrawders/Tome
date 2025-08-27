from typing import Any, Dict, List, Optional
from bson import ObjectId
from databases.mongo import Mongo, to_object_id

class ProfilesRepository:
    def __init__(self, uri: str, db_name: str, collection: str = "profiles"):
        self._mongo = Mongo(uri, db_name, collection)

    async def connect(self):
        await self._mongo.connect()

    async def close(self):
        await self._mongo.close()

    async def find_all(self) -> List[Dict[str, Any]]:
        return await self._mongo.find_all()

    async def find_one(self, profile_id: str) -> Optional[Dict[str, Any]]:
        oid: ObjectId = to_object_id(profile_id)
        return await self._mongo.find_one(oid)

    async def insert_one(self, data: Dict[str, Any]) -> Dict[str, Any]:
        return await self._mongo.insert_one(data)

    async def update_one(self, profile_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        oid: ObjectId = to_object_id(profile_id)
        return await self._mongo.update_one(oid, data)

    async def delete_one(self, profile_id: str) -> bool:
        oid: ObjectId = to_object_id(profile_id)
        return await self._mongo.delete_one(oid)

    async def find_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        docs = await self._mongo.find_all()
        for d in docs:
            if d.get("username") == username:
                return d
        return None

    async def update_by_username(self, username: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        doc = await self.find_by_username(username)
        if not doc:
            return None
        _id = doc.get("_id") or doc.get("id")
        return await self.update_one(str(_id), data)

    async def delete_by_username(self, username: str) -> bool:
        doc = await self.find_by_username(username)
        if not doc:
            return False
        _id = doc.get("_id") or doc.get("id")
        return await self.delete_one(str(_id))
