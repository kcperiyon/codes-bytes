import { useEffect, useState } from "react";
import { api, money } from "../../lib/api";
import { Badge } from "../../components/Badge";

interface Commission {
  id: string;
  rateBp: number;
  amountMinor: number;
  currency: string;
  status: string;
  createdAt: string;
  sale: { product: { name: string } };
}

export default function AssociateCommissions() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  useEffect(() => {
    api<Commission[]>("/api/associate/commissions").then(setCommissions);
  }, []);

  return (
    <div>
      <h1>Your commissions</h1>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Product</th>
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
                <td>{c.rateBp / 100}%</td>
                <td>{money(c.amountMinor, c.currency)}</td>
                <td>
                  <Badge status={c.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {commissions.length === 0 && <p className="muted">No commissions yet.</p>}
      </div>
    </div>
  );
}
