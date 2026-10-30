import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, ApiError } from "../lib/api";

interface LinkInfo {
  ownerType: "PARTNER" | "ASSOCIATE";
  ownerName: string;
  code: string;
  canRecruit: boolean;
  products: { slug: string; name: string; goUrl: string }[];
}

export default function AssociateLink() {
  const { code } = useParams();
  const [info, setInfo] = useState<LinkInfo | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<LinkInfo>(`/api/public/link/${code}`)
      .then(setInfo)
      .catch((err) => setError(err instanceof ApiError ? err.message : "This link isn't available"));
  }, [code]);

  if (error) {
    return (
      <div className="landing">
        <div className="landing-inner landing-hero">
          <h1>Link not found</h1>
          <p className="muted">{error}</p>
          <Link className="btn secondary" to="/">
            Go home
          </Link>
        </div>
      </div>
    );
  }

  if (!info) return null;

  return (
    <div className="landing">
      <div className="landing-inner">
        <div className="landing-hero">
          <div className="eyebrow">Associate link</div>
          <h1>Shopping with {info.ownerName}</h1>
          <p className="muted">Pick a product below — your purchase is credited to {info.ownerName}.</p>
        </div>

        {info.products.map((p) => (
          <div className="product-card" key={p.slug}>
            <span className="name">{p.name}</span>
            <a className="btn" href={p.goUrl}>
              Shop {p.name}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
