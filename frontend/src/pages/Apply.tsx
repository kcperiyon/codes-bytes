import { useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../lib/api";

export default function Apply() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api("/api/apply/partner", { method: "POST", body: JSON.stringify(form) });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="auth-page">
        <div className="auth-box card">
          <h1>Application received</h1>
          <p className="muted">We'll review it and send you a sign-in link once approved.</p>
          <Link to="/">Back home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <form className="auth-box card" onSubmit={submit}>
        <h1>Become a Partner</h1>
        {error && <div className="error">{error}</div>}
        <label>Full name</label>
        <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <label>Email</label>
        <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <label>Phone (optional)</label>
        <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <label>Anything we should know? (optional)</label>
        <textarea rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
        <button disabled={busy} type="submit">
          {busy ? "Submitting..." : "Apply"}
        </button>
        <p className="muted" style={{ marginTop: 12 }}>
          Already approved? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
