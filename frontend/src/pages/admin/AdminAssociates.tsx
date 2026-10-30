import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Badge } from "../../components/Badge";
import { useConfirm } from "../../lib/ui";

interface Associate {
  id: string;
  code: string;
  name: string;
  email: string;
  status: string;
  partner: { name: string; code: string };
}

export default function AdminAssociates() {
  const [associates, setAssociates] = useState<Associate[]>([]);
  const [filter, setFilter] = useState("");
  const confirmAction = useConfirm();

  function load() {
    api<Associate[]>(`/api/admin/associates${filter ? `?status=${filter}` : ""}`).then(setAssociates);
  }
  useEffect(load, [filter]);

  async function suspend(id: string) {
    const ok = await confirmAction({
      title: "Suspend this associate?",
      message: "They stop earning new commissions until reinstated.",
      confirmLabel: "Suspend",
      danger: true,
    });
    if (!ok) return;
    await api(`/api/admin/associates/${id}/suspend`, { method: "POST" });
    load();
  }
  async function reinstate(id: string) {
    await api(`/api/admin/associates/${id}/reinstate`, { method: "POST" });
    load();
  }

  return (
    <div>
      <h1>Associates</h1>
      <div className="pill-row">
        {["", "PENDING", "APPROVED", "SUSPENDED"].map((s) => (
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
              <th>Partner</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {associates.map((a) => (
              <tr key={a.id}>
                <td>{a.name}</td>
                <td>{a.email}</td>
                <td>{a.code}</td>
                <td>{a.partner.name}</td>
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
        {associates.length === 0 && <p className="muted">No associates in this view.</p>}
      </div>
    </div>
  );
}
