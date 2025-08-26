import React, { useEffect, useMemo, useState, useRef } from "react";
import tomeLogo from "../tome_logo.png";

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

  const [editMode, setEditMode] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [form, setForm] = useState({
    title: "",
    author: "",
    genre: "",
    year: "",
    image: "",
    review: "",
  });

  const [confirmOpen, setConfirmOpen] = useState(false);

  // Profile dropdown (click-to-toggle)
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  useEffect(() => {
    const onDocClick = (e) => {
      if (!profileRef.current) return;
      if (!profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setProfileOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // Add-book modal state
  const [addOpen, setAddOpen] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState("");
  const [newForm, setNewForm] = useState({
    title: "",
    author: "",
    genre: "",
    year: "",
    image: "",
    review: "",
  });

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
      setEditMode(false);
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
        if (!cancelled) {
          setBook(data);
          setEditMode(false);
          setEditError("");
        }
      } catch (err) {
        if (!cancelled) {
          setBookError(err?.message || "Failed to load book details.");
          setBook(null);
          setEditMode(false);
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

  const beginEdit = () => {
    if (!book) return;
    setForm({
      title: book.title ?? "",
      author: book.author ?? "",
      genre: book.genre ?? "",
      year: book.year ?? "",
      image: book.image ?? "",
      review: book.review ?? "",
    });
    setEditError("");
    setEditMode(true);
  };

  const openConfirm = () => setConfirmOpen(true);
  const closeConfirm = () => setConfirmOpen(false);

  const openAdd = () => {
    setNewForm({ title: "", author: "", genre: "", year: "", image: "", review: "" });
    setAddError("");
    setAddOpen(true);
  };
  const closeAdd = () => setAddOpen(false);

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!selectedId) return;
    setEditSaving(true);
    setEditError("");
    const payload = {
      title: form.title || null,
      author: form.author || null,
      genre: form.genre || null,
      year: form.year ? Number(form.year) : null,
      image: form.image || null,
      review: form.review || null,
    };
    try {
      let res = await fetch(`${API_BASE}/books/${encodeURIComponent(selectedId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 405) {
        res = await fetch(`${API_BASE}/books/${encodeURIComponent(selectedId)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) throw new Error(`Save failed: ${res.status}`);
      const updated = await res.json();
      setBook(updated);
      setBooks((list) =>
        list.map((b) => {
          const id = b.id || b._id || b.book_id;
          return id === selectedId ? { ...b, ...updated } : b;
        })
      );
      setEditMode(false);
    } catch (err) {
      setEditError(err?.message || "Failed to save changes.");
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    try {
      const res = await fetch(`${API_BASE}/books/${encodeURIComponent(selectedId)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      setBooks((list) => list.filter((b) => (b.id || b._id || b.book_id) !== selectedId));
      setSelectedId(null);
      setBook(null);
      setEditMode(false);
    } catch (err) {
      alert(err?.message || "Failed to delete.");
    }
  };

  const confirmDelete = async () => {
    setConfirmOpen(false);
    await handleDelete();
  };

  const submitAdd = async (e) => {
    e.preventDefault();
    setAddSaving(true);
    setAddError("");
    try {
      const payload = {
        title: newForm.title || null,
        author: newForm.author || null,
        genre: newForm.genre || null,
        year: newForm.year ? Number(newForm.year) : null,
        image: newForm.image || null,
        review: newForm.review || null,
      };
      const res = await fetch(`${API_BASE}/books`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Create failed: ${res.status}`);
      const created = await res.json();
      setBooks((list) => [...list, created]);
      setAddOpen(false);
      // Optionally auto-select:
      // const newId = created.id || created._id || created.book_id;
      // if (newId) setSelectedId(newId);
    } catch (err) {
      setAddError(err?.message || "Failed to create book.");
    } finally {
      setAddSaving(false);
    }
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

        {/* Centered Add button */}
        <div className="nav-center">
          <button className="btn btn-add" onClick={openAdd} title="Add Book" aria-label="Add Book">
            +
          </button>
        </div>

        {/* Profile: click-to-toggle dropdown */}
        <div className="nav-right">
          <div
            className={"profile" + (profileOpen ? " open" : "")}
            ref={profileRef}
          >
            <div className="avatar">MB</div>
            <button
              className="profile-toggle"
              aria-expanded={profileOpen}
              aria-haspopup="menu"
              onClick={() => setProfileOpen((v) => !v)}
            >
              Profile <span className="chev">▾</span>
            </button>
            <div className="profile-menu" role="menu">
              <button role="menuitem" onClick={() => alert("View Profile clicked")}>
                View Profile
              </button>
              <button
                role="menuitem"
                className="logout"
                onClick={() => alert("Logged out (stub)")}
              >
                Log Out
              </button>
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
              <div className="details-header">
                <h3 className="details-title">{show(book.title)}</h3>
                {!editMode && (
                  <div className="details-actions">
                    <button className="btn btn-edit" onClick={beginEdit} title="Edit">
                      <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                      </svg>
                      Edit
                    </button>
                    <button className="btn btn-delete" onClick={openConfirm} title="Delete">
                      <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                        <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                      </svg>
                      Delete
                    </button>
                  </div>
                )}
              </div>

              {!editMode && (
                <>
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
                </>
              )}

              {editMode && (
                <form className="edit-form" onSubmit={submitEdit}>
                  {editError && <p className="error">Error: {editError}</p>}
                  <div className="edit-list">
                    <div className="edit-item">
                      <label>Title</label>
                      <input
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                      />
                    </div>
                    <div className="edit-item">
                      <label>Author</label>
                      <input
                        value={form.author}
                        onChange={(e) => setForm({ ...form, author: e.target.value })}
                      />
                    </div>
                    <div className="edit-item">
                      <label>Genre</label>
                      <input
                        value={form.genre}
                        onChange={(e) => setForm({ ...form, genre: e.target.value })}
                      />
                    </div>
                    <div className="edit-item">
                      <label>Year</label>
                      <input
                        type="number"
                        value={form.year}
                        onChange={(e) => setForm({ ...form, year: e.target.value })}
                      />
                    </div>
                    <div className="edit-item">
                      <label>Image URL</label>
                      <input
                        value={form.image}
                        onChange={(e) => setForm({ ...form, image: e.target.value })}
                        placeholder="https://example.com/cover.jpg"
                      />
                    </div>
                    <div className="edit-item" style={{ alignItems: "start" }}>
                      <label>Review</label>
                      <textarea
                        rows={3}
                        value={form.review}
                        onChange={(e) => setForm({ ...form, review: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="edit-actions">
                    <button type="button" className="btn btn-cancel" onClick={() => setEditMode(false)} disabled={editSaving}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-edit" disabled={editSaving}>
                      {editSaving ? "Saving…" : "Save changes"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {confirmOpen && (
            <div className="modal-backdrop" role="dialog" aria-modal="true">
              <div className="modal">
                <h4>Delete “{book?.title || "this book"}”?</h4>
                <p>This action can’t be undone.</p>
                <div className="modal-actions">
                  <button className="btn btn-cancel" onClick={closeConfirm}>Cancel</button>
                  <button className="btn btn-delete" onClick={confirmDelete}>
                    <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                    </svg>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Add New Book modal */}
      {addOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <h4>Add New Book</h4>
            {addError && <p className="error">Error: {addError}</p>}
            <form className="edit-form" onSubmit={submitAdd}>
              <div className="edit-list">
                <div className="edit-item">
                  <label>Title</label>
                  <input
                    value={newForm.title}
                    onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
                  />
                </div>
                <div className="edit-item">
                  <label>Author</label>
                  <input
                    value={newForm.author}
                    onChange={(e) => setNewForm({ ...newForm, author: e.target.value })}
                  />
                </div>
                <div className="edit-item">
                  <label>Genre</label>
                  <input
                    value={newForm.genre}
                    onChange={(e) => setNewForm({ ...newForm, genre: e.target.value })}
                  />
                </div>
                <div className="edit-item">
                  <label>Year</label>
                  <input
                    type="number"
                    value={newForm.year}
                    onChange={(e) => setNewForm({ ...newForm, year: e.target.value })}
                  />
                </div>
                <div className="edit-item">
                  <label>Image URL</label>
                  <input
                    value={newForm.image}
                    onChange={(e) => setNewForm({ ...newForm, image: e.target.value })}
                    placeholder="https://example.com/cover.jpg"
                  />
                </div>
                <div className="edit-item" style={{ alignItems: "start" }}>
                  <label>Review</label>
                  <textarea
                    rows={3}
                    value={newForm.review}
                    onChange={(e) => setNewForm({ ...newForm, review: e.target.value })}
                  />
                </div>
              </div>
              <div className="edit-actions">
                <button type="button" className="btn btn-cancel" onClick={closeAdd} disabled={addSaving}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-create" disabled={addSaving}>
                  <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {addSaving ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
