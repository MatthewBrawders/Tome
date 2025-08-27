// src/pages/Login.jsx
import tomeLogo from "../assets/tome_logo.png";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth.jsx";
import { useNavigate } from "react-router-dom";
import "../css/login.css";

const setUserCookie = (u) =>
  (document.cookie = `tome_user=${encodeURIComponent(u)}; path=/; max-age=31536000; samesite=lax`);
const getUserCookie = () =>
  Object.fromEntries(document.cookie.split(";").map(v => v.trim().split("="))).tome_user;

function decodeJwt(cred) {
  const base64 = cred.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  const json = decodeURIComponent(
    atob(base64)
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join("")
  );
  return JSON.parse(json);
}

function GoogleButton({ onCred }) {
  const btnRef = useRef(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) return;
    const id = "google-identity-script";
    if (!document.getElementById(id)) {
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.defer = true;
      s.id = id;
      s.onload = init;
      document.head.appendChild(s);
    } else {
      init();
    }
    function init() {
      // eslint-disable-next-line no-undef
      if (window.google && window.google.accounts && btnRef.current) {
        // eslint-disable-next-line no-undef
        google.accounts.id.initialize({
          client_id: clientId,
          callback: (resp) => onCred(resp.credential),
        });
        // eslint-disable-next-line no-undef
        google.accounts.id.renderButton(btnRef.current, {
          type: "standard",
          shape: "pill",
          theme: "outline",
          size: "large",
          text: "continue_with",
          logo_alignment: "left",
        });
      }
    }
  }, [clientId, onCred]);

  if (!clientId) return null;
  return <div className="g-wrap"><div ref={btnRef} /></div>;
}

export default function Login() {
  const { login, upsertGoogle } = useAuth();
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

  async function onGoogleCredential(credential) {
    try {
      setErr("");
      const payload = decodeJwt(credential);
      const email = payload?.email;
      const sub = payload?.sub;
      await upsertGoogle(email, sub);
      nav("/");
    } catch (e) {
      setErr(e.message || "Google sign-in failed");
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

        <GoogleButton onCred={onGoogleCredential} />

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
