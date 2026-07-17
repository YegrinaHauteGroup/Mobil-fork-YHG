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
          <span className="brand-logo"><span className="brand-dot" />Mobil</span>
        </div>
        <div className="auth-panel">
          <h1 className="auth-h">Sign in</h1>
          <p className="auth-desc">Authentication is required to access your storage.</p>
          <LoginForm redirectTo={redirect} />
        </div>
        <div className="auth-foot">
          No account? <Link href="/signup">Sign up</Link>
        </div>
      </div>
    </div>
  );
}
