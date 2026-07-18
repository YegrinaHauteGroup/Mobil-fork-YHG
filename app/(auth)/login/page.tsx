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
    <div className="auth-wrap auth-wrap-noscroll">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-logo brand-logo-lg">Mobil</span>
        </div>
        <LoginForm redirectTo={redirect} />
        <div className="auth-foot">
          No account? <Link href="/signup">Sign up</Link>
        </div>
      </div>
    </div>
  );
}
