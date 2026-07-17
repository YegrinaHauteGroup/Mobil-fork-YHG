import Link from "next/link";
import "../auth.css";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark">◆</span>
          <span className="brand-name mono">MOBIL</span>
        </div>
        <div className="auth-panel">
          <h1 className="auth-h">로그인</h1>
          <p className="auth-desc">저장소에 접근하려면 인증이 필요합니다.</p>
          <LoginForm redirectTo={redirect} />
        </div>
        <div className="auth-foot">
          계정이 없나요? <Link href="/signup">회원가입</Link>
        </div>
      </div>
    </div>
  );
}
