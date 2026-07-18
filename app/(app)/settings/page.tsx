import { requireUser } from "@/lib/auth";
import { Copyable } from "@/components/copyable";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { userId, email, profile } = await requireUser();

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Settings</span>
        <span className="crumb">ACCOUNT / SETTINGS</span>
      </div>
      <div className="content" style={{ maxWidth: 640 }}>
        <div className="page-head">
          <div>
            <h1 className="page-h">Settings</h1>
            <p className="page-sub">Manage your profile and account.</p>
          </div>
        </div>

        <div className="panel" style={{ marginBottom: 24 }}>
          <div className="panel-header">
            <span className="label">PROFILE</span>
          </div>
          <div className="panel-body">
            <SettingsForm initialName={profile.display_name ?? ""} />
          </div>
        </div>

        <div className="panel" style={{ marginBottom: 24 }}>
          <div className="panel-header">
            <span className="label">ACCOUNT</span>
          </div>
          <div className="panel-body">
            <div className="field">
              <span className="label">Email</span>
              <div className="mono" style={{ color: "var(--text-1)", marginTop: 6 }}>
                {email}
              </div>
            </div>
            <div className="field">
              <span className="label">Access level</span>
              <div style={{ marginTop: 6 }}>
                {profile.role === "admin" ? (
                  <span className="badge badge-admin">admin</span>
                ) : (
                  <span className="badge">user</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <span className="label">MY SHARE ID</span>
          </div>
          <div className="panel-body">
            <p className="page-sub" style={{ margin: "0 0 12px" }}>
              Others need this ID to share files, documents or maps with you.
            </p>
            <Copyable value={userId} />
          </div>
        </div>
      </div>
    </>
  );
}
