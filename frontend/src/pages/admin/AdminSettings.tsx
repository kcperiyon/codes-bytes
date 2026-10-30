import { useState } from "react";
import { api, ApiError } from "../../lib/api";
import { useToast } from "../../lib/ui";

export default function AdminSettings() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword !== confirm) {
      setError("Passwords don't match");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setBusy(true);
    try {
      await api("/api/admin/change-password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) });
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
      toast("Password changed");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to change password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1>Settings</h1>
      <div className="card" style={{ maxWidth: 420 }}>
        <h3>Change password</h3>
        {error && <div className="error">{error}</div>}
        <form onSubmit={submit}>
          <label>Current password</label>
          <input required type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          <label>New password</label>
          <input required type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <label>Confirm new password</label>
          <input required type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          <button disabled={busy} type="submit">
            {busy ? "Saving..." : "Change password"}
          </button>
        </form>
      </div>
    </div>
  );
}
