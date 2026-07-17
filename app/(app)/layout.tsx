import "./app.css";
import { requireUser } from "@/lib/auth";
import { AppHeader } from "./header";
import { Sidebar } from "./sidebar";
import { Shortcuts } from "./shortcuts";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { email, profile } = await requireUser();

  return (
    <div className="app">
      <AppHeader
        displayName={profile.display_name ?? ""}
        email={email}
        role={profile.role}
      />
      <div className="app-body">
        <Sidebar role={profile.role} />
        <main className="app-main">{children}</main>
      </div>
      <Shortcuts />
    </div>
  );
}
