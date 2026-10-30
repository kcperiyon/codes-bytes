import { useEffect, useState } from "react";
import { api, money } from "../../lib/api";
import { Badge } from "../../components/Badge";

interface Sale {
  id: string;
  amountMinor: number;
  currency: string;
  status: string;
  createdAt: string;
  ownerType: string;
  product: { name: string };
  associate?: { name: string } | null;
}

export default function PartnerSales() {
  const [sales, setSales] = useState<Sale[]>([]);
  useEffect(() => {
    api<Sale[]>("/api/partner/sales").then(setSales);
  }, []);

  return (
    <div>
      <h1>Sales (yours + your Associates')</h1>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Product</th>
              <th>Sold by</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => (
              <tr key={s.id}>
                <td>{new Date(s.createdAt).toLocaleString()}</td>
                <td>{s.product.name}</td>
                <td>{s.ownerType === "PARTNER" ? "You" : s.associate?.name}</td>
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
