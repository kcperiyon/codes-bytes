import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="auth-page">
      <div className="auth-box" style={{ textAlign: "center" }}>
        <h1>Codes&amp;Bytes Sales</h1>
        <p className="muted">
          Sell Flux9, TaxMasterAgent, and more through your own Partner network. Recruit your Associates, share your
          link, earn on every sale.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 20 }}>
          <Link className="btn" to="/partners">
            Become a Partner
          </Link>
          <Link className="btn secondary" to="/login">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
