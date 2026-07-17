"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string };

const MAIN: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/files", label: "Files" },
  { href: "/documents", label: "Documents" },
  { href: "/code", label: "Code" },
  { href: "/mindmap", label: "Mindmap" },
];

export function Sidebar({
  displayName,
  email,
  role,
}: {
  displayName: string;
  email: string;
  role: "user" | "admin";
}) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const initial = (displayName || email || "?").charAt(0).toUpperCase();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-name">Mobil</span>
      </div>

      <nav className="nav">
        <div className="nav-section label">Workspace</div>
        {MAIN.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-link ${isActive(item.href) ? "active" : ""}`}
          >
            {item.label}
          </Link>
        ))}

        <div className="nav-section label">Admin</div>
        <Link
          href="/admin/redeem"
          className={`nav-link ${isActive("/admin/redeem") ? "active" : ""}`}
        >
          Redeem Code
        </Link>
        {role === "admin" && (
          <Link
            href="/admin"
            className={`nav-link ${pathname === "/admin" ? "active" : ""}`}
          >
            Admin Console
          </Link>
        )}
      </nav>

      <div className="sidebar-foot">
        <div className="user-chip">
          <div className="avatar">{initial}</div>
          <div className="user-meta">
            <div className="user-name">
              {displayName || email.split("@")[0]}
              {role === "admin" && (
                <span className="badge badge-admin" style={{ marginLeft: 6 }}>
                  admin
                </span>
              )}
            </div>
            <div className="user-mail">{email}</div>
          </div>
        </div>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="btn btn-ghost btn-sm btn-block"
            style={{ marginTop: 8, justifyContent: "flex-start" }}
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
