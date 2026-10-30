import { useEffect, useState } from "react";
import { api, money } from "../../lib/api";
import { Badge } from "../../components/Badge";

interface Sale {
  id: string;
  amountMinor: number;
  currency: string;
  status: string;
  createdAt: string;
  product: { name: string };
}

export default function AssociateSales() {
  const [sales, setSales] = useState<Sale[]>([]);
  useEffect(() => {
    api<Sale[]>("/api/associate/sales").then(setSales);
  }, []);

  return (
    <div>
      <h1>Your sales</h1>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Product</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => (
              <tr key={s.id}>
                <td>{new Date(s.createdAt).toLocaleString()}</td>
                <td>{s.product.name}</td>
                <td>{money(s.amountMinor, s.currency)}</td>
                <td>
                  <Badge status={s.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sales.length === 0 && <p className="muted">No sales yet.</p>}
      </div>
    </div>
  );
}
