import React, { useEffect, useMemo, useRef, useState } from "react";
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

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const show = (v) => (v === 0 || v ? String(v) : "—");
  const refresh = () => window.location.reload();

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
  const handleBookClick = (id) => setSelectedId((cur) => (cur === id ? null : id));

  // Close dropdown on outside click / ESC
  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const viewProfile = () => {
    setMenuOpen(false);
    alert("View Profile clicked"); // swap to your route later
  };
  const logOut = () => {
    setMenuOpen(false);
    alert("Logged out"); // hook up to your auth later
  };

  return (
    <div className="page">
      {/* NAV BAR */}
      <nav className="nav">
        <div className="nav-inner">
          <div className="brand-wrap">
            <button className="brand" onClick={refresh} aria-label="Refresh">
              <img src={tomeLogo} alt="Tome logo" className="brand-logo" />
            </button>
            <button className="brand-title" onClick={refresh} title="Refresh">
              TOME
            </button>
          </div>

          <div className="nav-actions">
            <div className="profile" ref={menuRef}>
              <button
                className="profile-btn"
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
              >
                <span className="avatar">MB</span>
                <span className="profile-label">Profile</span>
                <svg width="14" height="14" viewBox="0 0 24 24" className="chev">
                  <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" />
                </svg>
              </button>

              {menuOpen && (
                <div className="menu" role="menu">
                  <button className="menu-item" onClick={viewProfile} role="menuitem">
                    View Profile
                  </button>
                  <button className="menu-item danger" onClick={logOut} role="menuitem">
                    Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="grid">
        <section className="panel">
          <h2 className="panel-title">All Books</h2>
          {listLoading && <p className="muted">Loading…</p>}
          {listError && <p className="error">Error: {listError}</p>}
          {!listLoading && !hasBooks && !listError && (
            <p className="muted">No books yet.</p>
          )}
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
            <div className="details">
              <div className="detail-row">
                <span className="label">ID</span>
                <span className="value">{show(book.id || book._id || selectedId)}</span>
              </div>
              <div className="detail-row">
                <span className="label">Title</span>
                <span className="value">{show(book.title)}</span>
              </div>
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
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
