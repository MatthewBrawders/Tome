from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import os

from managers.books_manager import BooksManager
from models.books_model import BookCreate, BookUpdate, BookOut

from managers.profile_manager import ProfilesManager
from models.profile_model import ProfileCreate, ProfileUpdate, ProfileOut

from managers.comment_manager import CommentsManager
from models.comment_model import CommentCreate, CommentOut

app = FastAPI(title="Books & Profiles API")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://mongo:27017")
DB_NAME = os.environ.get("MONGO_DB_NAME", "booksdb")
BOOKS_COLLECTION = os.environ.get("MONGO_COLLECTION", "books")
PROFILES_COLLECTION = os.environ.get("MONGO_PROFILES", "profiles")
COMMENTS_COLLECTION = os.environ.get("MONGO_COMMENTS", "comments")  

books: BooksManager | None = None
profiles: ProfilesManager | None = None
comments: CommentsManager | None = None 

@app.on_event("startup")
async def _startup():
    global books, profiles, comments
    books = BooksManager(MONGO_URI, DB_NAME, BOOKS_COLLECTION)
    profiles = ProfilesManager(MONGO_URI, DB_NAME, PROFILES_COLLECTION)
    comments = CommentsManager(MONGO_URI, DB_NAME, COMMENTS_COLLECTION)
    await books.connect()
    await profiles.connect()
    await comments.connect()

@app.on_event("shutdown")
async def _shutdown():
    if books:
        await books.close()
    if profiles:
        await profiles.close()
    if comments:
        await comments.close()

@app.get("/ping")
async def ping():
    return {"message": "pong"}

# ----- Books -----

@app.get("/books", response_model=List[BookOut])
async def list_books():
    assert books is not None
    return await books.list_books()

@app.post("/books", response_model=BookOut, status_code=201)
async def create_book(data: BookCreate):
    assert books is not None
    return await books.create_book(data)

@app.put("/books/{book_id}", response_model=BookOut)
async def update_book(book_id: str, data: BookUpdate):
    assert books is not None
    payload = data.model_dump(exclude_unset=True, exclude_none=True)
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")
    payload.pop("views", None)  

    updated = await books.update_book(book_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Book not found")
    return updated

@app.get("/books/by/{username}", response_model=List[BookOut])
async def list_books_by_user(username: str):
    assert books is not None
    return await books.list_books_by_user(username)

@app.get("/books/{book_id}", response_model=BookOut)
async def get_book(book_id: str):
    assert books is not None
    updated = await books.increment_and_get(book_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Book not found")
    return updated

# ----- Profiles -----

@app.get("/profiles", response_model=List[ProfileOut])
async def list_profiles():
    assert profiles is not None
    return await profiles.list_profiles()

@app.get("/profiles/{username}", response_model=ProfileOut)
async def get_profile(username: str):
    assert profiles is not None
    found = await profiles.get_profile(username)
    if not found:
        raise HTTPException(status_code=404, detail="Profile not found")
    return found

@app.post("/profiles", response_model=ProfileOut, status_code=201)
async def create_profile(data: ProfileCreate):
    assert profiles is not None
    if not data.username or not 3 <= len(data.username) <= 20:
        raise HTTPException(status_code=422, detail="Invalid username")
    if len(data.password) < 8:
        raise HTTPException(status_code=422, detail="Password too short")
    if await profiles.get_profile(data.username):
        raise HTTPException(status_code=409, detail="Username already taken")
    return await profiles.create_profile(data)

@app.post("/profiles/login", response_model=ProfileOut)
async def profiles_login(body: dict):
    assert profiles is not None
    username = (body.get("username") or "").strip()
    password = body.get("password") or ""
    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password required")
    authed = await profiles.authenticate(username, password)
    if not authed:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return authed

@app.put("/profiles/{username}", response_model=ProfileOut)
async def update_profile(username: str, data: ProfileUpdate):
    assert profiles is not None
    payload = data.model_dump(exclude_unset=True, exclude_none=True)
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")
    updated = await profiles.update_profile(username, data)
    if not updated:
        raise HTTPException(status_code=404, detail="Profile not found")
    return updated

@app.delete("/profiles/{username}", status_code=204)
async def delete_profile(username: str):
    assert profiles is not None
    ok = await profiles.delete_profile(username)
    if not ok:
        raise HTTPException(status_code=404, detail="Profile not found")

# ----- Comments -----

@app.post("/comments", response_model=CommentOut, status_code=201)
async def create_comment(data: CommentCreate):
    assert comments is not None
    return await comments.create_comment(data)

@app.get("/comments/{comment_id}", response_model=CommentOut)
async def get_comment(comment_id: str):
    assert comments is not None
    found = await comments.get_comment(comment_id)
    if not found:
        raise HTTPException(status_code=404, detail="Comment not found")
    return found

@app.delete("/comments/{comment_id}", status_code=204)
async def delete_comment(comment_id: str):
    assert comments is not None
    ok = await comments.delete_comment(comment_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Comment not found")

@app.get("/comments/by-book/{book_id}", response_model=List[CommentOut])
async def list_comments_by_book(book_id: str, limit: int = 100, skip: int = 0):
    assert comments is not None
    return await comments.list_comments_by_book(book_id, limit=limit, skip=skip)

@app.get("/comments/by-user/{username}", response_model=List[CommentOut])
async def list_comments_by_user(username: str, limit: int = 100, skip: int = 0):
    assert comments is not None
    return await comments.list_comments_by_user(username, limit=limit, skip=skip)

@app.delete("/books/{book_id}", status_code=204)
async def delete_book(book_id: str):
    assert books is not None and comments is not None
    ok = await books.delete_book(book_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Book not found")
    await comments.delete_comments_by_book(book_id)
