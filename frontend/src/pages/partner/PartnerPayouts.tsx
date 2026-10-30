import { useEffect, useState } from "react";
import { api, money } from "../../lib/api";
import { Badge } from "../../components/Badge";

interface Payout {
  id: string;
  currency: string;
  amountMinor: number;
  status: string;
  requestedAt: string;
  reference?: string;
  note?: string;
}

export default function PartnerPayouts() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  useEffect(() => {
    api<Payout[]>("/api/partner/payouts").then(setPayouts);
  }, []);

  return (
    <div>
      <h1>Your payout requests</h1>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Requested</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Reference / note</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((p) => (
              <tr key={p.id}>
                <td>{new Date(p.requestedAt).toLocaleString()}</td>
                <td>{money(p.amountMinor, p.currency)}</td>
                <td>
                  <Badge status={p.status} />
                </td>
                <td>{p.reference || p.note || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {payouts.length === 0 && <p className="muted">No requests yet — request a payout from your overview page.</p>}
      </div>
    </div>
  );
}
