// src/pages/Login.jsx
import tomeLogo from "../assets/tome_logo.png";
import { useState } from "react";
import { useAuth } from "../auth.jsx";
import { useNavigate } from "react-router-dom";
import "../css/login.css";

// tiny cookie helpers
const setUserCookie = (u) =>
  (document.cookie = `tome_user=${encodeURIComponent(u)}; path=/; max-age=31536000; samesite=lax`);
const getUserCookie = () =>
  Object.fromEntries(document.cookie.split(";").map(v => v.trim().split("="))).tome_user;

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [username, setU] = useState(getUserCookie() ? decodeURIComponent(getUserCookie()) : "");
  const [password, setP] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      await login(username.trim(), password);
      setUserCookie(username.trim());
      nav("/");
    } catch (e) {
      setErr(e.message || "Login failed");
    }
  }

  return (
    <div className="login-page">
      <div className="login-hero">
        <div className="logo-wrap">
          <img className="logo-img" src={tomeLogo} alt="Tome logo" draggable="false" />
        </div>
        <h1 className="hero-title">TOME</h1>
      </div>

      <form onSubmit={onSubmit} className="auth-card" autoComplete="on">
        <h2 className="card-title">Sign in</h2>

        <label className="field">
          <span>Username</span>
          <input
            className="input"
            placeholder="yourname"
            value={username}
            onChange={(e) => setU(e.target.value)}
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            className="input"
            placeholder="••••••••"
            type="password"
            value={password}
            onChange={(e) => setP(e.target.value)}
          />
        </label>

        {err && <div className="error">{err}</div>}

        <div className="actions">
          <button type="submit" className="btn primary">Login</button>
          <button type="button" className="btn ghost" onClick={() => nav("/signup")} aria-label="Go to sign up">
            Sign up
          </button>
        </div>
      </form>
    </div>
  );
}
