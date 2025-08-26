# ===== managers/profiles_manager.py =====
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from models.profile_model import ProfileCreate, ProfileUpdate, ProfileOut
from databases.profiles_repository import ProfilesRepository


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
    return d


def _to_out(doc: Dict[str, Any]) -> ProfileOut:
    d = _normalize_id(doc)
    return ProfileOut.model_validate(d)


class ProfilesManager:
    def __init__(self, uri: str, db_name: str, collection: str = "profiles"):
        self._repo = ProfilesRepository(uri, db_name, collection)

    async def connect(self):
        await self._repo.connect()

    async def close(self):
        await self._repo.close()

    async def list_profiles(self) -> List[ProfileOut]:
        docs = await self._repo.find_all()
        out: List[ProfileOut] = []
        for d in docs:
            try:
                out.append(_to_out(d))
            except Exception:
                continue
        return out

    async def get_profile(self, profile_id: str) -> Optional[ProfileOut]:
        doc = await self._repo.find_one(profile_id)
        return _to_out(doc) if doc else None

    async def create_profile(self, data: ProfileCreate) -> ProfileOut:
        # NOTE: hash password server-side before insert if you store passwords!
        payload = data.model_dump()
        inserted = await self._repo.insert_one(payload)
        if "inserted_id" in inserted and "_id" not in inserted and "id" not in inserted:
            created_id = str(inserted["inserted_id"])
            doc = await self._repo.find_one(created_id)
        else:
            doc = inserted
        return _to_out(doc)

    async def update_profile(self, profile_id: str, data: ProfileUpdate) -> Optional[ProfileOut]:
        payload = data.model_dump(exclude_unset=True, exclude_none=True)
        if not payload:
            doc = await self._repo.find_one(profile_id)
            return _to_out(doc) if doc else None
        doc = await self._repo.update_one(profile_id, payload)
        return _to_out(doc) if doc else None

    async def delete_profile(self, profile_id: str) -> bool:
        return await self._repo.delete_one(profile_id)

    async def list_books(self, username: Optional[str] = None) -> List[BookOut]:
        docs = await (self._repo.find_by_username(username) if username else self._repo.find_all())
        return [_to_out(d) for d in docs if d]