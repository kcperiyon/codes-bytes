import { useEffect, useState } from "react";
import { api, money } from "../../lib/api";
import { Badge } from "../../components/Badge";
import { useConfirm } from "../../lib/ui";

interface Commission {
  id: string;
  beneficiaryType: string;
  role: string;
  rateBp: number;
  amountMinor: number;
  currency: string;
  status: string;
  createdAt: string;
  partner?: { name: string } | null;
  associate?: { name: string } | null;
  sale: { product: { name: string } };
}

export default function AdminCommissions() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [filter, setFilter] = useState("PENDING");
  const confirmAction = useConfirm();

  function load() {
    api<Commission[]>(`/api/admin/commissions${filter ? `?status=${filter}` : ""}`).then(setCommissions);
  }
  useEffect(load, [filter]);

  async function approveAll() {
    const ok = await confirmAction({
      title: "Approve all pending commissions?",
      message: "They become available for payout.",
      confirmLabel: "Approve all",
    });
    if (!ok) return;
    await api("/api/admin/commissions/approve", { method: "POST", body: JSON.stringify({}) });
    load();
  }

  return (
    <div>
      <h1>Commissions</h1>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div className="pill-row" style={{ marginBottom: 0 }}>
          {["PENDING", "APPROVED", "PAID", "CLAWED_BACK", ""].map((s) => (
            <button key={s} className={filter === s ? "" : "secondary"} onClick={() => setFilter(s)}>
              {s || "All"}
            </button>
          ))}
        </div>
        {filter === "PENDING" && commissions.length > 0 && <button onClick={approveAll}>Approve all pending</button>}
      </div>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Product</th>
              <th>Beneficiary</th>
              <th>Role</th>
              <th>Rate</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {commissions.map((c) => (
              <tr key={c.id}>
                <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                <td>{c.sale.product.name}</td>
                <td>{c.beneficiaryType === "PARTNER" ? c.partner?.name : c.associate?.name}</td>
                <td>{c.role}</td>
                <td>{c.rateBp / 100}%</td>
                <td>{money(c.amountMinor, c.currency)}</td>
                <td>
                  <Badge status={c.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {commissions.length === 0 && <p className="muted">Nothing here.</p>}
      </div>
    </div>
  );
}
