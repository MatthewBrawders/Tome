import React, { useEffect, useMemo, useState } from "react";
import tomeLogo from "./tome_logo.png";

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ??
  import.meta.env.VITE_API_BASE ??
  "/api"
).replace(/\/+$/, "");

export default function App() {
  const [books, setBooks] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [selectedId, setSelectedId] = useState(null);
  const [bookLoading, setBookLoading] = useState(false);
  const [bookError, setBookError] = useState("");
  const [book, setBook] = useState(null);

  const show = (v) => (v === 0 || v ? String(v) : "—");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setListLoading(true);
        setListError("");
        const res = await fetch(`${API_BASE}/books`);
        if (!res.ok) throw new Error(`List fetch failed: ${res.status}`);
        const data = await res.json();
        if (!cancelled) setBooks(data);
      } catch (err) {
        if (!cancelled) setListError(err?.message || "Failed to load books.");
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setBook(null);
      setBookError("");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setBookLoading(true);
        setBookError("");
        const res = await fetch(`${API_BASE}/books/${encodeURIComponent(selectedId)}`);
        if (!res.ok) throw new Error(`Detail fetch failed: ${res.status}`);
        const data = await res.json();
        if (!cancelled) setBook(data);
      } catch (err) {
        if (!cancelled) {
          setBookError(err?.message || "Failed to load book details.");
          setBook(null);
        }
      } finally {
        if (!cancelled) setBookLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedId]);

  const hasBooks = useMemo(() => Array.isArray(books) && books.length > 0, [books]);

  const handleBookClick = (id) => {
    setSelectedId((cur) => (cur === id ? null : id));
  };

  return (
    <div className="page">
      <header className="header nav">
        <div className="brand-wrap">
          <button
            className="brand"
            onClick={() => window.location.reload()}
            aria-label="Home"
            title="Refresh"
          >
            <img className="brand-logo" src={tomeLogo} alt="Tome logo" draggable="false" />
          </button>
          <button
            className="brand-title"
            onClick={() => window.location.reload()}
            title="Refresh"
          >
            TOME
          </button>
        </div>

        <div className="nav-right">
          <div className="profile">
            <div className="avatar">MB</div>
            <button className="profile-toggle">
              Profile <span className="chev">▾</span>
            </button>
            <div className="profile-menu">
              <button onClick={() => alert("View Profile clicked")}>View Profile</button>
              <button onClick={() => alert("Logged out (stub)")}>Log Out</button>
            </div>
          </div>
        </div>
      </header>

      <main className="grid">
        <section className="panel">
          <h2 className="panel-title">All Books</h2>
          {listLoading && <p className="muted">Loading…</p>}
          {listError && <p className="error">Error: {listError}</p>}
          {!listLoading && !hasBooks && !listError && <p className="muted">No books yet.</p>}
          <ul className="book-list">
            {books.map((b) => {
              const id = b.id || b._id || b.book_id;
              return (
                <li key={id}>
                  <button
                    className={"book-item" + (id === selectedId ? " selected" : "")}
                    onClick={() => handleBookClick(id)}
                    title="View details"
                  >
                    <span className="book-title">{b.title}</span>
                    {b.author && <span className="book-author">by {b.author}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="panel">
          <h2 className="panel-title">Book Details</h2>

          {!selectedId && <p className="muted">Select a book to see details.</p>}
          {bookLoading && <p className="muted">Loading details…</p>}
          {bookError && <p className="error">Error: {bookError}</p>}

          {!!book && !bookLoading && !bookError && (
            <div className="details details-vertical">
              <h3 className="details-title">{show(book.title)}</h3>

              <div className="cover-frame">
                {book.image ? (
                  <img
                    className="cover-img"
                    src={book.image}
                    alt={book.title || "Book cover"}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      const ph = e.currentTarget.parentElement?.querySelector(".cover-empty");
                      if (ph) ph.style.display = "flex";
                    }}
                  />
                ) : null}
                <div className="cover-empty" style={{ display: book.image ? "none" : "flex" }}>
                  No cover
                </div>
              </div>

              <div className="kv">
                <div className="detail-row">
                  <span className="label">Author</span>
                  <span className="value">{show(book.author)}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Genre</span>
                  <span className="value">{show(book.genre)}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Year</span>
                  <span className="value">{show(book.year)}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Review</span>
                  <span className="value">{show(book.review)}</span>
                </div>
                <div className="detail-row">
                  <span className="label">ID</span>
                  <span className="value">{show(book.id || book._id || selectedId)}</span>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
