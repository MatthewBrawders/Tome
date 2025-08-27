// src/pages/signup.jsx
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth.jsx";
import { useNavigate, Link } from "react-router-dom";
import tomeLogo from "../assets/tome_logo.png";
import "../css/signup.css";

const setUserCookie = (u) =>
  (document.cookie = `tome_user=${encodeURIComponent(u)}; path=/; max-age=31536000; samesite=lax`);

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
          text: "signup_with",
          logo_alignment: "left",
        });
      }
    }
  }, [clientId, onCred]);

  if (!clientId) return null;
  return <div className="g-wrap"><div ref={btnRef} /></div>;
}

export default function Signup() {
  const nav = useNavigate();
  const { signup, register, login, upsertGoogle } = useAuth();
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

  async function onGoogleCredential(credential) {
    try {
      setErr("");
      setBusy(true);
      const payload = decodeJwt(credential);
      const email = payload?.email;
      const sub = payload?.sub;
      await upsertGoogle(email, sub);
      nav("/");
    } catch (e) {
      setErr(e.message || "Google sign-up failed");
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

        <GoogleButton onCred={onGoogleCredential} />

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
