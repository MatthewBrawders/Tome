# ===== main.py =====
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import os

from managers.books_manager import BooksManager
from models.books_model import BookCreate, BookUpdate, BookOut

app = FastAPI(title="Books API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # lock down later if you want
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://mongo:27017")
DB_NAME = os.environ.get("MONGO_DB_NAME", "booksdb")
COLLECTION = os.environ.get("MONGO_COLLECTION", "books")

books: BooksManager | None = None

@app.on_event("startup")
async def _startup():
    global books
    books = BooksManager(MONGO_URI, DB_NAME, COLLECTION)
    await books.connect()

@app.on_event("shutdown")
async def _shutdown():
    if books:
        await books.close()

@app.get("/ping")
async def ping():
    return {"message": "pong"}

@app.get("/books", response_model=List[BookOut])
async def list_books():
    assert books is not None
    return await books.list_books()

@app.get("/books/{book_id}", response_model=BookOut)
async def get_book(book_id: str):
    assert books is not None
    found = await books.get_book(book_id)
    if not found:
        raise HTTPException(status_code=404, detail="Book not found")
    return found

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
    updated = await books.update_book(book_id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="Book not found")
    return updated

@app.delete("/books/{book_id}", status_code=204)
async def delete_book(book_id: str):
    assert books is not None
    ok = await books.delete_book(book_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Book not found")