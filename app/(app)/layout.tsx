import "./app.css";
import { requireUser } from "@/lib/auth";
import { AppHeader } from "./header";
import { Sidebar } from "./sidebar";
import { Shortcuts } from "./shortcuts";
import { WorkspaceProvider } from "./workspace/workspace-context";
import { WorkspaceShell } from "./workspace/workspace-shell";
import { MobileNavProvider } from "./mobile-nav-context";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { email, profile } = await requireUser();

  return (
    <MobileNavProvider>
      <WorkspaceProvider>
        <div className="app">
          <AppHeader
            displayName={profile.display_name ?? ""}
            email={email}
            role={profile.role}
          />
          <div className="app-body">
            <Sidebar role={profile.role} />
            <main className="app-main">
              <WorkspaceShell>{children}</WorkspaceShell>
            </main>
          </div>
          <Shortcuts />
        </div>
      </WorkspaceProvider>
    </MobileNavProvider>
  );
}
