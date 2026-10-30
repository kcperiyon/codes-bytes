import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await api<{ token: string; role: "ADMIN" | "PARTNER" | "ASSOCIATE"; name?: string; code?: string }>(
        "/api/auth/login",
        { method: "POST", body: JSON.stringify({ email, password }) }
      );
      login({ token: res.token, role: res.role, name: res.name || email, code: res.code });
      navigate(res.role === "ADMIN" ? "/super-admin" : res.role === "PARTNER" ? "/partner" : "/associate");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-box card" onSubmit={submit}>
        <h1>Sign in</h1>
        {error && <div className="error">{error}</div>}
        <label>Email</label>
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label>Password</label>
        <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button disabled={busy} type="submit">
          {busy ? "Signing in..." : "Sign in"}
        </button>
        <p className="muted" style={{ marginTop: 12 }}>
          Not a Partner yet? <Link to="/partners">Apply here</Link>
        </p>
      </form>
    </div>
  );
}
