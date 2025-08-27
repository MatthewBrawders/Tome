// src/pages/Signup.jsx
import { useState } from "react";
import { useAuth } from "../auth.jsx";
import { useNavigate, Link } from "react-router-dom";
import tomeLogo from "../assets/tome_logo.png";
import "../css/signup.css";

const setUserCookie = (u) =>
  (document.cookie = `tome_user=${encodeURIComponent(u)}; path=/; max-age=31536000; samesite=lax`);

export default function Signup() {
  const nav = useNavigate();
  const { signup, register, login } = useAuth();
  const doSignup = signup || register || login;

  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const [confirm, setC] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (busy) return;
    setErr("");
    const u = username.trim();
    if (!u || !password || !confirm) return setErr("Please fill in all fields.");
    if (password.length < 6) return setErr("Password must be at least 6 characters.");
    if (password !== confirm) return setErr("Passwords do not match.");
    if (!doSignup) return setErr("Signup is not available.");
    try {
      setBusy(true);
      await doSignup(u, password);
      setUserCookie(u);
      nav("/");
    } catch (e) {
      setErr(e?.message || "Signup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="signup-page">
      <div className="signup-hero">
        <div className="logo-wrap">
          <img className="brand-logo" src={tomeLogo} alt="Tome logo" draggable="false" />
        </div>
        <h1 className="hero-title">TOME</h1>
      </div>

      <form onSubmit={onSubmit} className="auth-card signup-form">
        <h2 className="card-title">Create your account</h2>

        <label className="field">
          <span>Username</span>
          <input
            className="input"
            placeholder="Username"
            value={username}
            onChange={(e) => setU(e.target.value)}
            autoComplete="username"
            required
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            className="input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setP(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>

        <label className="field">
          <span>Confirm password</span>
          <input
            className="input"
            type="password"
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setC(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />
        </label>

        {err && <div className="error">{err}</div>}

        <div className="actions">
          <button className="btn primary" type="submit" disabled={busy}>
            {busy ? "Signing up..." : "Sign up"}
          </button>
          <Link to="/login" className="btn ghost">Back to login</Link>
        </div>
      </form>
    </div>
  );
}
