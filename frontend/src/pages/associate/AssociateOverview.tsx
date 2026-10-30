import { useEffect, useState } from "react";
import { api, money, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useToast } from "../../lib/ui";

interface Balance {
  status: string;
  balances: { currency: string; amountMinor: number }[];
}

export default function AssociateOverview() {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [error, setError] = useState("");
  const [busyCurrency, setBusyCurrency] = useState("");
  const { session } = useAuth();
  const toast = useToast();

  const myLink = session?.code ? `${window.location.origin}/associates/${session.code}` : "";

  function load() {
    api<Balance>("/api/associate/balance").then(setBalance);
  }
  useEffect(load, []);

  async function requestPayout(currency: string) {
    setError("");
    setBusyCurrency(currency);
    try {
      await api("/api/associate/payouts", { method: "POST", body: JSON.stringify({ currency }) });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to request payout");
    } finally {
      setBusyCurrency("");
    }
  }

  return (
    <div>
      <h1>Your overview</h1>
      {error && <div className="error">{error}</div>}

      <div className="card">
        <h3>Your link</h3>
        <p className="muted">Share this link — every sale through it earns you 20%.</p>
        <div className="link-row">
          <code>{myLink}</code>
          <button
            className="secondary"
            onClick={() => {
              navigator.clipboard.writeText(myLink);
              toast("Copied to clipboard");
            }}
          >
            Copy
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Available balance</h3>
        {balance?.status !== "APPROVED" && <p className="error">Your account is {balance?.status?.toLowerCase()} — payouts are disabled.</p>}
        {(balance?.balances.length ?? 0) === 0 && <p className="muted">Nothing available yet.</p>}
        {balance?.balances.map((b) => (
          <div key={b.currency} className="stat-row" style={{ marginBottom: 8 }}>
            <div className="stat">
              <div className="label">{b.currency}</div>
              <div className="value">{money(b.amountMinor, b.currency)}</div>
            </div>
            <button
              disabled={b.amountMinor <= 0 || balance.status !== "APPROVED" || busyCurrency === b.currency}
              onClick={() => requestPayout(b.currency)}
            >
              {busyCurrency === b.currency ? "Requesting..." : `Request ${b.currency} payout`}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
