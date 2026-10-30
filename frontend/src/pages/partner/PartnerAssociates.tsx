import { useEffect, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { Badge } from "../../components/Badge";
import { useConfirm, useToast } from "../../lib/ui";
import { useAuth } from "../../lib/auth";

interface Associate {
  id: string;
  name: string;
  email: string;
  code: string;
  status: string;
}

export default function PartnerAssociates() {
  const [associates, setAssociates] = useState<Associate[]>([]);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [error, setError] = useState("");
  const [lastLink, setLastLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const confirmAction = useConfirm();
  const toast = useToast();
  const { session } = useAuth();

  const recruitUrl = session?.code ? `${window.location.origin}/partners/${session.code}` : "";

  function load() {
    api<Associate[]>("/api/partner/associates").then(setAssociates);
  }
  useEffect(load, []);

  async function addAssociate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await api<{ setPasswordLink: string }>("/api/partner/associates", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setLastLink(res.setPasswordLink);
      setForm({ name: "", email: "", phone: "" });
      setShowManualAdd(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add associate");
    } finally {
      setBusy(false);
    }
  }

  async function approve(id: string) {
    const res = await api<{ setPasswordLink: string }>(`/api/partner/associates/${id}/approve`, { method: "POST" });
    setLastLink(res.setPasswordLink);
    load();
  }

  async function reject(id: string) {
    const ok = await confirmAction({ title: "Reject this application?", confirmLabel: "Reject", danger: true });
    if (!ok) return;
    await api(`/api/partner/associates/${id}/reject`, { method: "POST" });
    load();
  }

  async function suspend(id: string) {
    const ok = await confirmAction({
      title: "Suspend this associate?",
      message: "They stop earning new commissions until reinstated.",
      confirmLabel: "Suspend",
      danger: true,
    });
    if (!ok) return;
    await api(`/api/partner/associates/${id}/suspend`, { method: "POST" });
    load();
  }
  async function reinstate(id: string) {
    await api(`/api/partner/associates/${id}/reinstate`, { method: "POST" });
    load();
  }

  const pending = associates.filter((a) => a.status === "PENDING");
  const others = associates.filter((a) => a.status !== "PENDING");

  return (
    <div>
      <h1>Your Associates</h1>

      <div className="card">
        <h3>Recruit link</h3>
        <p className="muted">Share this link — anyone who applies through it lands in your queue below for you to approve.</p>
        <div className="link-row">
          <code>{recruitUrl}</code>
          <button
            className="secondary"
            onClick={() => {
              navigator.clipboard.writeText(recruitUrl);
              toast("Copied to clipboard");
            }}
          >
            Copy
          </button>
        </div>
        <button className="ghost small" style={{ marginTop: 10, padding: 0 }} onClick={() => setShowManualAdd((v) => !v)}>
          {showManualAdd ? "Hide manual add" : "Or add someone directly instead"}
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      {lastLink && (
        <div className="card">
          <div className="success">Send this set-password link to them:</div>
          <div className="link-row">
            <code>{lastLink}</code>
            <button
              className="secondary"
              onClick={() => {
                navigator.clipboard.writeText(lastLink);
                toast("Copied to clipboard");
              }}
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {showManualAdd && (
        <div className="card">
          <h3>Add an Associate directly</h3>
          <p className="muted">They're approved immediately — use this only if you're adding someone you already know.</p>
          <form onSubmit={addAssociate}>
            <label>Name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <label>Email</label>
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <label>Phone (optional)</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <button disabled={busy} type="submit">
              {busy ? "Adding..." : "Add Associate"}
            </button>
          </form>
        </div>
      )}

      {pending.length > 0 && (
        <div className="card">
          <h3>Pending applications</h3>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((a) => (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td>{a.email}</td>
                  <td>
                    <button onClick={() => approve(a.id)} style={{ marginRight: 6 }}>
                      Approve
                    </button>
                    <button className="danger" onClick={() => reject(a.id)}>
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {others.map((a) => (
              <tr key={a.id}>
                <td>{a.name}</td>
                <td>{a.email}</td>
                <td>
                  <Badge status={a.status} />
                </td>
                <td>
                  {a.status === "APPROVED" && (
                    <button className="danger" onClick={() => suspend(a.id)}>
                      Suspend
                    </button>
                  )}
                  {a.status === "SUSPENDED" && <button onClick={() => reinstate(a.id)}>Reinstate</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {others.length === 0 && <p className="muted">No associates yet.</p>}
      </div>
    </div>
  );
}
