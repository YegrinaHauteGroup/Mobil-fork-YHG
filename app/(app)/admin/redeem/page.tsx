import { requireUser } from "@/lib/auth";
import { RedeemForm } from "./redeem-form";

export const dynamic = "force-dynamic";

export default async function RedeemPage() {
  const { profile } = await requireUser();

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">관리자 코드 등록</span>
        <span className="crumb">ADMIN / REDEEM</span>
      </div>
      <div className="content" style={{ maxWidth: 560 }}>
        <div className="page-head">
          <div>
            <h1 className="page-h">관리자 코드 등록</h1>
            <p className="page-sub">
              발급받은 관리자 코드를 입력하면 계정이 관리자 권한으로
              승격됩니다.
            </p>
          </div>
        </div>

        {profile.role === "admin" ? (
          <div className="notice notice-info">
            이미 관리자 권한을 보유하고 있습니다.
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
