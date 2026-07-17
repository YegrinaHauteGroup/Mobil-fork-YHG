"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string; icon: string };

const MAIN: NavItem[] = [
  { href: "/dashboard", label: "대시보드", icon: "▦" },
  { href: "/files", label: "파일", icon: "▤" },
  { href: "/documents", label: "문서", icon: "▧" },
  { href: "/code", label: "코드", icon: "‹›" },
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

  const initial = (displayName || email || "?").charAt(0);

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-mark">◆</span>
        <span className="brand-name mono">MOBIL</span>
      </div>

      <nav className="nav">
        <div className="nav-section label">WORKSPACE</div>
        {MAIN.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-link ${isActive(item.href) ? "active" : ""}`}
          >
            <span className="ico">{item.icon}</span>
            {item.label}
          </Link>
        ))}

        <div className="nav-section label">ADMIN</div>
        <Link
          href="/admin/redeem"
          className={`nav-link ${isActive("/admin/redeem") ? "active" : ""}`}
        >
          <span className="ico">◈</span>
          코드 등록
        </Link>
        {role === "admin" && (
          <Link
            href="/admin"
            className={`nav-link ${pathname === "/admin" ? "active" : ""}`}
          >
            <span className="ico">⚙</span>
            관리자 콘솔
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
            로그아웃
          </button>
        </form>
      </div>
    </aside>
  );
}
