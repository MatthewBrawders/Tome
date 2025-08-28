from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from models.profile_model import ProfileCreate, ProfileUpdate, ProfileOut
from databases.profile_repository import ProfilesRepository
from security import verify_password, hash_password

def _normalize_id(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not doc:
        return None
    d = dict(doc)
    _id = d.pop("_id", None)
    if _id is not None:
        d["id"] = str(_id)
    elif "inserted_id" in d:
        d["id"] = str(d.pop("inserted_id"))
    elif "id" in d:
        d["id"] = str(d["id"])
    return d

def _to_out(doc: Optional[Dict[str, Any]]) -> Optional[ProfileOut]:
    d = _normalize_id(doc)
    if not d:
        return None
    d.pop("password", None)
    d.pop("password_hash", None)
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
            o = _to_out(d)
            if o:
                out.append(o)
        return out

    async def get_profile(self, username: str) -> Optional[ProfileOut]:
        doc = await self._repo.find_by_username(username.strip())
        return _to_out(doc)

    async def create_profile(self, data: ProfileCreate | Dict[str, Any]) -> ProfileOut:
        payload = data.model_dump() if isinstance(data, BaseModel) else dict(data)
        print(f"[DEBUG] create_profile: incoming payload (raw) = {payload}")

        username = (payload.get("username") or "").strip()
        if not username:
            raise RuntimeError("Username required")

        existing = await self._repo.find_by_username(username)
        print(f"[DEBUG] create_profile: existing for '{username}' = {existing}")
        if existing:
            raise RuntimeError("Username already exists")

        if payload.get("password"):
            payload["password_hash"] = hash_password(payload["password"])
            debug_payload_before_insert = dict(payload)
            payload.pop("password", None)
        else:
            debug_payload_before_insert = dict(payload)

        print(f"[DEBUG] create_profile: about to insert payload = {debug_payload_before_insert}")

        ins = await self._repo.insert_one(payload)
        print(f"[DEBUG] create_profile: insert_one result type={type(ins).__name__}, value={ins}")

        created = await self._repo.find_by_username(username)
        print(f"[DEBUG] create_profile: re-fetched by username='{username}' -> {created}")

        if not created:
            raise RuntimeError(f"Failed to retrieve created profile for username: {username}")

        out = _to_out(created)
        if not out:
            raise RuntimeError("Failed to convert profile to output format")
        return out



    async def update_profile(self, username: str, data: ProfileUpdate | Dict[str, Any]) -> Optional[ProfileOut]:
        payload = (
            data.model_dump(exclude_unset=True, exclude_none=True)
            if isinstance(data, BaseModel)
            else {k: v for k, v in dict(data).items() if v is not None}
        )
        if not payload:
            return await self.get_profile(username)
        if payload.get("password"):
            payload["password_hash"] = hash_password(payload["password"])
            payload.pop("password", None)
        doc = await self._repo.update_by_username(username.strip(), payload)
        return _to_out(doc)

    async def delete_profile(self, username: str) -> bool:
        return await self._repo.delete_by_username(username.strip())

    async def authenticate(self, username: str, plain_password: str) -> Optional[ProfileOut]:
        doc = await self._repo.find_by_username((username or "").strip())
        if not doc:
            return None
        hashed = doc.get("password_hash") or doc.get("password")
        if not hashed or not verify_password(plain_password, hashed):
            return None
        return _to_out(doc)
