import { Link } from "react-router-dom";

export default function AssociatesInfo() {
  return (
    <div className="auth-page">
      <div className="auth-box card" style={{ textAlign: "center" }}>
        <h1>Join as an Associate</h1>
        <p className="muted">
          Associates join through a Partner's own link, not here directly. Ask the Partner who invited you for their
          link, or apply to become a Partner yourself.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 8 }}>
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
