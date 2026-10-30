import { useEffect, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { useConfirm } from "../../lib/ui";
import { useToast } from "../../lib/ui";

interface Product {
  id: string;
  slug: string;
  name: string;
  baseUrl: string;
  refParam: string;
  apiSecret: string;
  currencies: string[];
  active: boolean;
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [form, setForm] = useState({ slug: "", name: "", baseUrl: "", currencies: "USD" });
  const [newSecret, setNewSecret] = useState<{ name: string; value: string } | null>(null);
  const confirmAction = useConfirm();
  const toast = useToast();

  function load() {
    api<Product[]>("/api/admin/products").then(setProducts);
  }
  useEffect(load, []);

  async function createProduct(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api("/api/admin/products", {
        method: "POST",
        body: JSON.stringify({
          slug: form.slug,
          name: form.name,
          baseUrl: form.baseUrl,
          currencies: form.currencies.split(",").map((c) => c.trim().toUpperCase()),
        }),
      });
      setForm({ slug: "", name: "", baseUrl: "", currencies: "USD" });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create product");
    }
  }

  async function toggleActive(p: Product) {
    await api(`/api/admin/products/${p.id}/active`, { method: "PATCH", body: JSON.stringify({ active: !p.active }) });
    load();
  }

  async function rotateSecret(p: Product) {
    const ok = await confirmAction({
      title: `Rotate the API secret for ${p.name}?`,
      message: "That product's integration must be updated with the new value, or sale reporting will break.",
      confirmLabel: "Rotate secret",
      danger: true,
    });
    if (!ok) return;
    const res = await api<{ apiSecret: string }>(`/api/admin/products/${p.id}/rotate-secret`, { method: "POST" });
    setNewSecret({ name: p.name, value: res.apiSecret });
    load();
  }

  return (
    <div>
      <h1>Products</h1>
      {newSecret && (
        <div className="card">
          <div className="success">New secret for {newSecret.name} — give this to that product's team now, it won't be shown again:</div>
          <div className="link-row">
            <code>{newSecret.value}</code>
            <button
              className="secondary"
              onClick={() => {
                navigator.clipboard.writeText(newSecret.value);
                toast("Copied to clipboard");
              }}
            >
              Copy
            </button>
          </div>
        </div>
      )}
      <div className="card">
        <h3>Add a product</h3>
        {error && <div className="error">{error}</div>}
        <form onSubmit={createProduct}>
          <label>Slug (lowercase, no spaces)</label>
          <input required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="e.g. newproduct" />
          <label>Name</label>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <label>Base URL (where the ref code is appended as a query param)</label>
          <input required value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} placeholder="https://example.com" />
          <label>Currencies (comma-separated)</label>
          <input required value={form.currencies} onChange={(e) => setForm({ ...form, currencies: e.target.value })} />
          <button type="submit">Add product</button>
        </form>
      </div>

      {products.map((p) => (
        <div className="card" key={p.id}>
          <h3>
            {p.name} {!p.active && <span className="badge SUSPENDED">INACTIVE</span>}
          </h3>
          <p className="muted">
            {p.baseUrl} &middot; ref param <code>{p.refParam}</code> &middot; {p.currencies.join(", ")}
          </p>
          <div className="link-row">
            <span className="muted">API secret:</span>
            <code>{revealed[p.id] ? p.apiSecret : "•".repeat(24)}</code>
            <button className="secondary" onClick={() => setRevealed({ ...revealed, [p.id]: !revealed[p.id] })}>
              {revealed[p.id] ? "Hide" : "Reveal"}
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button className="secondary" onClick={() => toggleActive(p)}>
              {p.active ? "Deactivate" : "Activate"}
            </button>
            <button className="secondary" onClick={() => rotateSecret(p)}>
              Rotate secret
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
