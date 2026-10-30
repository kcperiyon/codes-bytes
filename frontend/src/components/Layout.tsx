import { NavLink } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { ReactNode } from "react";

export function Layout({
  nav,
  children,
  brand,
}: {
  nav: { to: string; label: string }[];
  children: ReactNode;
  brand?: string;
}) {
  const { session, logout } = useAuth();
  return (
    <div className="shell">
      <nav className="sidebar">
        <div className="brand">{brand || "Codes&Bytes Sales"}</div>
        {nav.map((n) => (
          <NavLink key={n.to} to={n.to} className={({ isActive }) => (isActive ? "active" : "")}>
            {n.label}
          </NavLink>
        ))}
        <div className="logout" onClick={logout}>
          Sign out {session ? `(${session.name})` : ""}
        </div>
      </nav>
      <div className="main">{children}</div>
    </div>
  );
}
