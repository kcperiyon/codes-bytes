import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";

export default function SetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setBusy(true);
    try {
      await api("/api/auth/set-password", { method: "POST", body: JSON.stringify({ token, password }) });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <div className="auth-page">
        <div className="card auth-box">This link is missing its token.</div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="auth-page">
        <div className="card auth-box">
          <h1>Password set</h1>
          <Link className="btn" to="/login">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <form className="auth-box card" onSubmit={submit}>
        <h1>Choose a password</h1>
        {error && <div className="error">{error}</div>}
        <label>New password</label>
        <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <label>Confirm password</label>
        <input required type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <button disabled={busy} type="submit">
          {busy ? "Saving..." : "Save password"}
        </button>
      </form>
    </div>
  );
}
