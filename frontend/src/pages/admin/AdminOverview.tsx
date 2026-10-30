import { useEffect, useState } from "react";
import { api, money } from "../../lib/api";

interface Overview {
  products: number;
  partners: number;
  associates: number;
  pendingPartners: number;
  sales: { currency: string; _sum: { amountMinor: number | null }; _count: number }[];
  pendingCommissions: { currency: string; _sum: { amountMinor: number | null } }[];
  payoutRequests: number;
}

export default function AdminOverview() {
  const [data, setData] = useState<Overview | null>(null);

  useEffect(() => {
    api<Overview>("/api/admin/overview").then(setData);
  }, []);

  if (!data) return <p className="muted">Loading...</p>;

  return (
    <div>
      <h1>Overview</h1>
      <div className="stat-row">
        <div className="stat">
          <div className="label">Products</div>
          <div className="value">{data.products}</div>
        </div>
        <div className="stat">
          <div className="label">Approved partners</div>
          <div className="value">{data.partners}</div>
        </div>
        <div className="stat">
          <div className="label">Approved associates</div>
          <div className="value">{data.associates}</div>
        </div>
        <div className="stat">
          <div className="label">Pending applications</div>
          <div className="value">{data.pendingPartners}</div>
        </div>
        <div className="stat">
          <div className="label">Payout requests waiting</div>
          <div className="value">{data.payoutRequests}</div>
        </div>
      </div>

      <div className="card">
        <h3>Total sales by currency</h3>
        {data.sales.length === 0 && <p className="muted">No sales yet.</p>}
        {data.sales.map((s) => (
          <p key={s.currency}>
            {money(s._sum.amountMinor || 0, s.currency)} across {s._count} sales
          </p>
        ))}
      </div>

      <div className="card">
        <h3>Commission liability pending approval</h3>
        {data.pendingCommissions.length === 0 && <p className="muted">Nothing pending.</p>}
        {data.pendingCommissions.map((c) => (
          <p key={c.currency}>{money(c._sum.amountMinor || 0, c.currency)}</p>
        ))}
      </div>
    </div>
  );
}
