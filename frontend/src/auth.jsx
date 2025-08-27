// src/auth.jsx
import { createContext, useContext, useEffect, useState } from "react";

const API = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");
const CRED = {
  credentials: "include",
  headers: { "Content-Type": "application/json" },
};

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

function sanitizeUsername(raw) {
  const u = (raw ?? "").trim();
  if (!/^[A-Za-z0-9._-]{3,20}$/.test(u)) return null;
  return u;
}

function validatePassword(raw) {
  const p = (raw ?? "");
  const ok = p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);
  return ok ? p : null;
}

async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function getUserCookie() {
  const m = document.cookie.match(/(?:^|;\s*)tome_user=([^;]*)/);
  return m ? decodeURIComponent(m[1]) : "";
}
function setUserCookie(username) {
  document.cookie = `tome_user=${encodeURIComponent(username)}; path=/; samesite=lax; max-age=31536000`;
}
function clearUserCookie() {
  document.cookie = "tome_user=; path=/; max-age=0; samesite=lax";
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function login(username, password) {
    const u = sanitizeUsername(username);
    const p = validatePassword(password);
    if (!u) throw new Error("Invalid username (3–20 chars: letters, numbers, . _ -).");
    if (!p) throw new Error("Password must be 8+ chars with letters and numbers.");

    const res = await fetch(`${API}/profiles/login`, {
      ...CRED,
      method: "POST",
      body: JSON.stringify({ username: u, password: p }),
    });
    if (!res.ok) {
      const data = await readJson(res);
      throw new Error(data?.detail || "Login failed");
    }
    const profile = (await readJson(res)) || { username: u };
    setUser(profile);
    setUserCookie(profile.username || u);
  }

  async function signup(username, password) {
    const u = sanitizeUsername(username);
    const p = validatePassword(password);
    if (!u) throw new Error("Invalid username (3–20 chars: letters, numbers, . _ -).");
    if (!p) throw new Error("Password must be 8+ chars with letters and numbers.");

    const res = await fetch(`${API}/profiles`, {
      ...CRED,
      method: "POST",
      body: JSON.stringify({ username: u, password: p }),
    });
    if (!res.ok) {
      const data = await readJson(res);
      throw new Error(data?.detail || "Signup failed");
    }
    const profile = (await readJson(res)) || { username: u };
    setUser(profile);
    setUserCookie(profile.username || u);
  }

  // Google: username = local part of email, password = sub
  async function upsertGoogle(email, sub) {
    const local = (email ?? "").trim().split("@")[0].toLowerCase();
    const u = sanitizeUsername(local);
    const p = (sub ?? "").trim();
    if (!u || !p) throw new Error("Missing or invalid Google account info.");

    let res = await fetch(`${API}/profiles/login`, {
      ...CRED,
      method: "POST",
      body: JSON.stringify({ username: u, password: p }),
    });

    if (!res.ok) {
      await fetch(`${API}/profiles`, {
        ...CRED,
        method: "POST",
        body: JSON.stringify({ username: u, password: p }),
      });
      res = await fetch(`${API}/profiles/login`, {
        ...CRED,
        method: "POST",
        body: JSON.stringify({ username: u, password: p }),
      });
      if (!res.ok) {
        const data = await readJson(res);
        throw new Error(data?.detail || "Google sign-in failed");
      }
    }

    // Force client username to the stripped local-part
    const profile = (await readJson(res)) || {};
    setUser({ ...profile, username: u });
    setUserCookie(u);
  }

  function logout() {
    clearUserCookie();
    setUser(null);
  }

  useEffect(() => {
    const cookieUser = getUserCookie();
    if (cookieUser) setUser({ username: cookieUser });
    setLoading(false);
  }, []);

  return (
    <AuthCtx.Provider value={{ user, loading, login, signup, logout, upsertGoogle }}>
      {children}
    </AuthCtx.Provider>
  );
}
