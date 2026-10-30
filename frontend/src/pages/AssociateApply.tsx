import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, ApiError } from "../lib/api";

export default function AssociateApply() {
  const { partnerCode } = useParams();
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ partnerName: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await api<{ partnerName: string }>(`/api/apply/associate/${partnerCode}`, {
        method: "POST",
        body: JSON.stringify(form),
      });
      setDone(res);
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
          <p className="muted">
            {done.partnerName} will review your application. You'll get a sign-in link by email once approved.
          </p>
          <Link to="/">Back home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <form className="auth-box card" onSubmit={submit}>
        <h1>Join as an Associate</h1>
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
