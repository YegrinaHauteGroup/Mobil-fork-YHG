import { requireUser } from "@/lib/auth";
import { RedeemForm } from "./redeem-form";

export const dynamic = "force-dynamic";

export default async function RedeemPage() {
  const { profile } = await requireUser();

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Redeem Admin Code</span>
        <span className="crumb">ADMIN / REDEEM</span>
      </div>
      <div className="content" style={{ maxWidth: 560 }}>
        <div className="page-head">
          <div>
            <h1 className="page-h">Redeem Admin Code</h1>
          </div>
        </div>

        {profile.role === "admin" ? (
          <div className="notice notice-info">
            You already have admin privileges.
          </div>
        ) : (
          <div className="panel">
            <div className="panel-body">
              <RedeemForm />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
