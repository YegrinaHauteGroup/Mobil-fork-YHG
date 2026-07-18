import "./app.css";
import { redirect } from "next/navigation";
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

  // 승인제: 관리자 승인 전(대기/거절)에는 앱 내 어떤 화면도 보여주지 않고
  // 대기 화면으로 보낸다. redeem_admin_code 가 승격과 동시에 승인도 강제하므로
  // role 은 별도로 검사할 필요가 없다.
  if (profile.approval_status !== "approved") {
    redirect("/pending-approval");
  }

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
