import "./app.css";
import { requireUser } from "@/lib/auth";
import { Sidebar } from "./sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { email, profile } = await requireUser();

  return (
    <div className="shell">
      <Sidebar
        displayName={profile.display_name ?? ""}
        email={email}
        role={profile.role}
      />
      <div className="main">{children}</div>
    </div>
  );
}
