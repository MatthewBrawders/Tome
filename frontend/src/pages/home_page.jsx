// src/pages/home_page.jsx (App)
import React, { useEffect, useMemo, useState, useRef } from "react";
import tomeLogo from "../assets/tome_logo.png";

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ??
  import.meta.env.VITE_API_BASE ??
  "/api"
).replace(/\/+$/, "");

const getUserCookie = () => {
  const m = document.cookie.match(/(?:^|;\s*)tome_user=([^;]*)/);
  return m ? decodeURIComponent(m[1]) : "";
};
const clearUserCookie = () =>
  (document.cookie = "tome_user=; path=/; max-age=0; samesite=lax");

// utils
const formatDateTime = () => new Date().toLocaleString();
const getBookId = (bk, fallbackId) => {
  const candidates = [bk?.id, bk?._id, bk?.book_id, fallbackId];
  for (const c of candidates) {
    if (c !== undefined && c !== null && String(c).trim() !== "") return c;
  }
  return null;
};

const DEFAULT_FILTERS = {
  q: "",
  author: "",
  genre: "",
  username: "",
  yearMin: "",
  yearMax: "",
  hasImage: "any",
  sort: "",
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(getUserCookie());

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
    username: "",
  });

  const [confirmOpen, setConfirmOpen] = useState(false);

  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  useEffect(() => {
    const onDocClick = (e) => {
      if (!profileRef.current) return;
      if (!profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setProfileOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

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
    username: "",
  });

  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [filterDraft, setFilterDraft] = useState(DEFAULT_FILTERS);

  // recommend toggle
  const [recommendOn, setRecommendOn] = useState(false);

  // comments state
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState("");
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  const show = (v) => (v === 0 || v ? String(v) : "—");
  const initials = (currentUser || "MB").slice(0, 2).toUpperCase();

  // initial load
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

  // load details + comments on select
  useEffect(() => {
    if (!selectedId) {
      setBook(null);
      setBookError("");
      setEditMode(false);
      // clear comments when nothing selected
      setComments([]);
      setCommentsError("");
      setNewComment("");
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
          // refresh comments for this book
          refreshComments(data);
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

  // comments helpers
  async function refreshComments(bookLike) {
    const bid = getBookId(bookLike || book, selectedId);
    if (bid === null) {
      setComments([]);
      setCommentsError("Book ID missing.");
      return;
    }
    try {
      setCommentsLoading(true);
      setCommentsError("");
      const res = await fetch(`${API_BASE}/comments/by-book/${encodeURIComponent(bid)}`);
      if (!res.ok) throw new Error(`Comments fetch failed: ${res.status}`);
      const data = await res.json();
      setComments(Array.isArray(data) ? data : []);
    } catch (err) {
      setCommentsError(err?.message || "Failed to load comments.");
    } finally {
      setCommentsLoading(false);
    }
  }

  async function submitComment(e) {
    e.preventDefault();
    const username = getUserCookie();
    const bid = getBookId(book, selectedId);

    if (!username) {
      setCommentsError("You must be logged in to comment.");
      return;
    }
    if (bid === null) {
      setCommentsError("Book ID missing.");
      return;
    }

    const text = newComment.trim();
    if (!text) return;

    const payload = {
      username,
      book_id: String(bid),  // <-- always string
      comment: text,
      date_and_time: new Date().toLocaleString(),
    };

    try {
      setPostingComment(true);
      setCommentsError("");
      const res = await fetch(`${API_BASE}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Create comment failed: ${res.status}`);
      const created = await res.json();
      setNewComment("");
      setComments((list) => [created, ...list]);
    } catch (err) {
      setCommentsError(err?.message || "Failed to post comment.");
    } finally {
      setPostingComment(false);
    }
  }

  const filteredBooks = useMemo(() => {
    let list = Array.isArray(books) ? [...books] : [];
    const txt = (s) => (s ?? "").toString().toLowerCase();
    const inRange = (y) => {
      if (!y && y !== 0) return true;
      const num = Number(y);
      const min = filterDraft.yearMin !== "" ? Number(filterDraft.yearMin) : null;
      const max = filterDraft.yearMax !== "" ? Number(filterDraft.yearMax) : null;
      if (min !== null && num < min) return false;
      if (max !== null && num > max) return false;
      return true;
    };

    const f = filters;
    list = list.filter((b) => {
      const username = txt(b.username);
      const title = txt(b.title);
      const author = txt(b.author);
      const genre = txt(b.genre);
      const review = txt(b.review);
      const q = txt(f.q);

      if (q && !(title.includes(q) || author.includes(q) || review.includes(q) || username.includes(q))) return false;
      if (f.author && !author.includes(txt(f.author))) return false;
      if (f.genre && !genre.includes(txt(f.genre))) return false;
      if (f.username && !username.includes(txt(f.username))) return false;
      if (!inRange(b.year)) return false;

      if (f.hasImage === "yes" && !b.image) return false;
      if (f.hasImage === "no" && !!b.image) return false;

      return true;
    });

    if (recommendOn) {
      list.sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
      return list;
    }

    switch (f.sort) {
      case "title-asc":
        list.sort((a, b) => txt(a.title).localeCompare(txt(b.title)));
        break;
      case "title-desc":
        list.sort((a, b) => txt(b.title).localeCompare(txt(a.title)));
        break;
      case "year-asc":
        list.sort((a, b) => (a.year ?? 0) - (b.year ?? 0));
        break;
      case "year-desc":
        list.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
        break;
      default:
        break;
    }

    return list;
  }, [books, filters, filterDraft.yearMin, filterDraft.yearMax, recommendOn]);

  const hasBooks = useMemo(
    () => Array.isArray(filteredBooks) && filteredBooks.length > 0,
    [filteredBooks]
  );

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
      username: book.username ?? "",
    });
    setEditError("");
    setEditMode(true);
  };

  const openConfirm = () => setConfirmOpen(true);
  const closeConfirm = () => setConfirmOpen(false);

  const openAdd = () => {
    setNewForm({
      title: "",
      author: "",
      genre: "",
      year: "",
      image: "",
      review: "",
      username: currentUser || "",
    });
    setAddError("");
    setAddOpen(true);
  };
  const closeAdd = () => setAddOpen(false);

  const toggleFilter = () => {
    setFilterDraft(filters);
    setFilterOpen((v) => !v);
  };

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
      username: form.username || currentUser || null,
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
      // also clear comments
      setComments([]);
      setCommentsError("");
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
      const username = getUserCookie();
      const payload = {
        username: username || null,
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
    } catch (err) {
      setAddError(err?.message || "Failed to create book.");
    } finally {
      setAddSaving(false);
    }
  };

  const cancelFilters = () => {
    setFilterDraft(filters);
    setFilterOpen(false);
  };
  const resetFilters = () => setFilterDraft(DEFAULT_FILTERS);
  const confirmFilters = () => {
    setFilters(filterDraft);
    setFilterOpen(false);
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
          <button className="brand-title" onClick={() => window.location.reload()} title="Refresh">
            TOME
          </button>
        </div>

        <div className="nav-center">
          <button className="btn btn-add" onClick={openAdd} title="Add Book" aria-label="Add Book">
            +
          </button>
        </div>

        <div className="nav-right">
          <div className={"profile" + (profileOpen ? " open" : "")} ref={profileRef}>
            <div className="avatar">{initials}</div>
            <button
              className="profile-toggle"
              aria-expanded={profileOpen}
              aria-haspopup="menu"
              onClick={() => setProfileOpen((v) => !v)}
            >
              {currentUser ? currentUser : "Profile"} <span className="chev">▾</span>
            </button>
            <div className="profile-menu" role="menu">
              <button role="menuitem" onClick={() => alert("View Profile clicked (placeholder for now)")}>
                View Profile
              </button>
              <button
                role="menuitem"
                className="logout"
                onClick={() => {
                  clearUserCookie();
                  window.location.href = "/login";
                }}
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="grid">
        <section className="panel">
          <div className="panel-title-row">
            <h2 className="panel-title">All Book Reviews</h2>

            <div className="panel-actions">
              <button
                className={"btn btn-circle btn-recommend" + (recommendOn ? " active" : "")}
                onClick={() => setRecommendOn(v => !v)}
                aria-pressed={recommendOn}
                title={recommendOn ? "Showing recommendations (most views)" : "Recommend by most views"}
              >
                <svg
                  className="btn-icon"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M7 10v12H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h3z"/>
                  <path d="M7 22h11a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-5.31l.95-4.57a1 1 0 0 0-.2-.82l-1-1.2a1 1 0 0 0-1.64.13L7 10"/>
                </svg>
              </button>

              <button
                className={"btn btn-circle" + (filterOpen ? " active" : "")}
                onClick={toggleFilter}
                aria-expanded={filterOpen}
                aria-controls="filters"
                title="Filter books"
              >
                <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="11" cy="11" r="7"></circle>
                  <line x1="16.65" y1="16.65" x2="21" y2="21"></line>
                </svg>
              </button>
            </div>
          </div>

          {filterOpen && (
            <div id="filters" className="filter-panel" role="region" aria-label="Filters">
              <div className="filter-list">
                <div className="filter-row">
                  <label>Search</label>
                  <input
                    placeholder="Title, author, review, or user…"
                    value={filterDraft.q}
                    onChange={(e) => setFilterDraft({ ...filterDraft, q: e.target.value })}
                  />
                </div>

                <div className="filter-row">
                  <label>Author</label>
                  <input
                    value={filterDraft.author}
                    onChange={(e) => setFilterDraft({ ...filterDraft, author: e.target.value })}
                  />
                </div>

                <div className="filter-row">
                  <label>Genre</label>
                  <input
                    value={filterDraft.genre}
                    onChange={(e) => setFilterDraft({ ...filterDraft, genre: e.target.value })}
                  />
                </div>

                <div className="filter-row">
                  <label>User</label>
                  <input
                    value={filterDraft.username}
                    onChange={(e) => setFilterDraft({ ...filterDraft, username: e.target.value })}
                  />
                </div>

                <div className="filter-row">
                  <label>Year</label>
                  <div className="two">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filterDraft.yearMin}
                      onChange={(e) => setFilterDraft({ ...filterDraft, yearMin: e.target.value })}
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filterDraft.yearMax}
                      onChange={(e) => setFilterDraft({ ...filterDraft, yearMax: e.target.value })}
                    />
                  </div>
                </div>

                <div className="filter-row">
                  <label>Has cover</label>
                  <select
                    value={filterDraft.hasImage}
                    onChange={(e) => setFilterDraft({ ...filterDraft, hasImage: e.target.value })}
                  >
                    <option value="any">Any</option>
                    <option value="yes">With cover</option>
                    <option value="no">No cover</option>
                  </select>
                </div>

                <div className="filter-row">
                  <label>Sort by</label>
                  <select
                    value={filterDraft.sort}
                    onChange={(e) => setFilterDraft({ ...filterDraft, sort: e.target.value })}
                    disabled={recommendOn}
                  >
                    <option value="">—</option>
                    <option value="title-asc">Title (A→Z)</option>
                    <option value="title-desc">Title (Z→A)</option>
                    <option value="year-asc">Year (oldest)</option>
                    <option value="year-desc">Year (newest)</option>
                  </select>
                </div>
              </div>

              <div className="filter-actions">
                <button type="button" className="btn btn-cancel" onClick={cancelFilters}>Cancel</button>
                <button type="button" className="btn btn-reset" onClick={resetFilters}>Reset</button>
                <button type="button" className="btn btn-confirm" onClick={confirmFilters}>Confirm</button>
              </div>
            </div>
          )}

          {listLoading && <p className="muted">Loading…</p>}
          {listError && <p className="error">Error: {listError}</p>}
          {!listLoading && !hasBooks && !listError && <p className="muted">No books yet.</p>}

          <ul className="book-list">
            {filteredBooks.map((b) => {
              const id = b.id || b._id || b.book_id;
              return (
                <li key={id}>
                  <button
                    className={"book-item" + (id === selectedId ? " selected" : "")}
                    onClick={() => handleBookClick(id)}
                    title="View details"
                  >
                    <span className="book-title">{b.title}</span>
                    <span className="book-meta">
                      {b.username ? <span className="book-user">by {b.username}</span> : null}
                    </span>
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
            <div>
              <div className="details details-vertical">
                <div className="details-header">
                  <div>
                    <h3 className="details-title">{show(book.title)}</h3>
                    {book.username ? (
                      <div className="details-subtitle">by {show(book.username)}</div>
                    ) : null}
                  </div>
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
                    <div className="detail-row">
                      <span className="label">Views</span>
                      <span className="value">{show(book.views)}</span>
                    </div>
                  </div>

                  {/* ===== Comment Section ===== */}
                  <div className="comments">
                    <h4 className="comments-title">Comments</h4>

                    {commentsLoading && <p className="muted">Loading comments…</p>}
                    {commentsError && <p className="error">Error: {commentsError}</p>}
                    {!commentsLoading && !commentsError && comments.length === 0 && (
                      <p className="muted">No comments yet.</p>
                    )}

                    <ul className="comment-list">
                      {comments.map((c, i) => {
                        const mine = c.username && c.username === currentUser;
                        return (
                          <li key={i} className={"comment-item " + (mine ? "mine" : "other")}>
                            <div className="comment-bubble">
                              <div className="comment-text">{c.comment}</div>
                              <div className="comment-meta">
                                <span className="comment-user">@{c.username || "unknown"}</span>
                                <span className="comment-dot">•</span>
                                <span className="comment-time">{c.date_and_time || ""}</span>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>

                    <form className="comment-form" onSubmit={submitComment}>
                      <input
                        className="comment-input"
                        placeholder={currentUser ? "Write a comment…" : "Log in to comment"}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        disabled={!currentUser || postingComment}
                      />
                      <button
                        className="btn btn-comment"
                        type="submit"
                        disabled={!currentUser || postingComment || !newComment.trim()}
                        title={currentUser ? "Send comment" : "Log in to comment"}
                      >
                        {postingComment ? "Sending…" : "Send"}
                      </button>
                    </form>
                  </div>
                  {/* ===== End Comments ===== */}
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
                    <div className="edit-item">
                      <label>User</label>
                      <input
                        value={form.username}
                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                        placeholder="username"
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

      {addOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <h4>Add New Book</h4>
            {addError && <p className="error">Error: {addError}</p>}
            <form className="edit-form" onSubmit={submitAdd}>
              <div className="edit-list">
                <div className="edit-item"></div>
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