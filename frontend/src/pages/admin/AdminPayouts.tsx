import { useEffect, useState } from "react";
import { api, money, ApiError } from "../../lib/api";
import { Badge } from "../../components/Badge";
import { usePrompt } from "../../lib/ui";

interface Payout {
  id: string;
  beneficiaryType: string;
  currency: string;
  amountMinor: number;
  status: string;
  requestedAt: string;
  reference?: string;
  partner?: { name: string; email: string } | null;
  associate?: { name: string; email: string } | null;
}

export default function AdminPayouts() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [filter, setFilter] = useState("REQUESTED");
  const [error, setError] = useState("");
  const promptAction = usePrompt();

  function load() {
    api<Payout[]>(`/api/admin/payouts${filter ? `?status=${filter}` : ""}`).then(setPayouts);
  }
  useEffect(load, [filter]);

  async function markPaid(id: string) {
    const reference = await promptAction({
      title: "Mark this payout as paid",
      label: "Payment reference",
      placeholder: "Bank transfer ref, transaction id, etc.",
      confirmLabel: "Mark paid",
      required: true,
    });
    if (reference === null) return;
    try {
      await api(`/api/admin/payouts/${id}/mark-paid`, { method: "POST", body: JSON.stringify({ reference }) });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed");
    }
  }

  async function reject(id: string) {
    const note = await promptAction({
      title: "Reject this payout request",
      label: "Reason",
      placeholder: "Why is this being rejected?",
      confirmLabel: "Reject",
      required: true,
    });
    if (note === null) return;
    await api(`/api/admin/payouts/${id}/reject`, { method: "POST", body: JSON.stringify({ note }) });
    load();
  }

  return (
    <div>
      <h1>Payouts</h1>
      {error && <div className="error">{error}</div>}
      <div className="pill-row">
        {["REQUESTED", "PAID", "REJECTED", ""].map((s) => (
          <button key={s} className={filter === s ? "" : "secondary"} onClick={() => setFilter(s)}>
            {s || "All"}
          </button>
        ))}
      </div>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Requested</th>
              <th>Who</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Reference</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((p) => (
              <tr key={p.id}>
                <td>{new Date(p.requestedAt).toLocaleString()}</td>
                <td>
                  {p.beneficiaryType === "PARTNER" ? p.partner?.name : p.associate?.name}
                  <div className="muted">{p.beneficiaryType === "PARTNER" ? p.partner?.email : p.associate?.email}</div>
                </td>
                <td>{money(p.amountMinor, p.currency)}</td>
                <td>
                  <Badge status={p.status} />
                </td>
                <td>{p.reference || "—"}</td>
                <td>
                  {p.status === "REQUESTED" && (
                    <>
                      <button onClick={() => markPaid(p.id)} style={{ marginRight: 6 }}>
                        Mark paid
                      </button>
                      <button className="danger" onClick={() => reject(p.id)}>
                        Reject
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {payouts.length === 0 && <p className="muted">Nothing here.</p>}
      </div>
    </div>
  );
}
