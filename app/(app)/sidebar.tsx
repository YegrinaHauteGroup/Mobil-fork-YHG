"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconDashboard,
  IconFiles,
  IconDocuments,
  IconCode,
  IconSheet,
  IconMindmap,
  IconKey,
  IconConsole,
} from "./icons";

type Item = { href: string; label: string; icon: React.ReactNode };

const MAIN: Item[] = [
  { href: "/dashboard", label: "Dashboard", icon: <IconDashboard /> },
  { href: "/files", label: "Files", icon: <IconFiles /> },
  { href: "/documents", label: "Documents", icon: <IconDocuments /> },
  { href: "/sheets", label: "Sheets", icon: <IconSheet /> },
  { href: "/code", label: "Code", icon: <IconCode /> },
  { href: "/mindmap", label: "Mindmap", icon: <IconMindmap /> },
];

export function Sidebar({ role }: { role: "user" | "admin" }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="rail">
      {MAIN.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`rail-link ${isActive(item.href) ? "active" : ""}`}
          title={item.label}
          aria-label={item.label}
        >
          {item.icon}
        </Link>
      ))}
      <div className="rail-sep" />
      <Link
        href="/admin/redeem"
        className={`rail-link ${isActive("/admin/redeem") ? "active" : ""}`}
        title="Redeem admin code"
        aria-label="Redeem admin code"
      >
        <IconKey />
      </Link>
      {role === "admin" && (
        <Link
          href="/admin"
          className={`rail-link ${pathname === "/admin" ? "active" : ""}`}
          title="Admin console"
          aria-label="Admin console"
        >
          <IconConsole />
        </Link>
      )}
    </aside>
  );
}
