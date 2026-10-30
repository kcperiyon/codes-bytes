import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Badge } from "../../components/Badge";
import { useConfirm, useToast } from "../../lib/ui";

interface Partner {
  id: string;
  code: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  notes?: string;
  _count: { associates: number };
}

export default function AdminPartners() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [filter, setFilter] = useState("");
  const [lastLink, setLastLink] = useState<string | null>(null);
  const confirmAction = useConfirm();
  const toast = useToast();

  function load() {
    api<Partner[]>(`/api/admin/partners${filter ? `?status=${filter}` : ""}`).then(setPartners);
  }
  useEffect(load, [filter]);

  async function approve(id: string) {
    const res = await api<{ setPasswordLink: string }>(`/api/admin/partners/${id}/approve`, { method: "POST" });
    setLastLink(res.setPasswordLink);
    load();
  }
  async function reject(id: string) {
    const ok = await confirmAction({ title: "Reject this application?", confirmLabel: "Reject", danger: true });
    if (!ok) return;
    await api(`/api/admin/partners/${id}/reject`, { method: "POST" });
    load();
  }
  async function suspend(id: string) {
    const ok = await confirmAction({
      title: "Suspend this partner?",
      message: "They and their associates stop earning new commissions until reinstated.",
      confirmLabel: "Suspend",
      danger: true,
    });
    if (!ok) return;
    await api(`/api/admin/partners/${id}/suspend`, { method: "POST" });
    load();
  }
  async function reinstate(id: string) {
    await api(`/api/admin/partners/${id}/reinstate`, { method: "POST" });
    load();
  }

  return (
    <div>
      <h1>Partners</h1>
      {lastLink && (
        <div className="card">
          <div className="success">Approved. Send this set-password link to the partner (shown once):</div>
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
      <div className="pill-row">
        {["", "PENDING", "APPROVED", "SUSPENDED", "REJECTED"].map((s) => (
          <button key={s} className={filter === s ? "" : "secondary"} onClick={() => setFilter(s)}>
            {s || "All"}
          </button>
        ))}
      </div>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Code</th>
              <th>Associates</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {partners.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.email}</td>
                <td>{p.code}</td>
                <td>{p._count.associates}</td>
                <td>
                  <Badge status={p.status} />
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  {p.status === "PENDING" && (
                    <>
                      <button onClick={() => approve(p.id)} style={{ marginRight: 6 }}>
                        Approve
                      </button>
                      <button className="danger" onClick={() => reject(p.id)}>
                        Reject
                      </button>
                    </>
                  )}
                  {p.status === "APPROVED" && (
                    <button className="danger" onClick={() => suspend(p.id)}>
                      Suspend
                    </button>
                  )}
                  {p.status === "SUSPENDED" && <button onClick={() => reinstate(p.id)}>Reinstate</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {partners.length === 0 && <p className="muted">No partners in this view.</p>}
      </div>
    </div>
  );
}
