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
      <LoginForm redirectTo={redirect} />
    </div>
  );
}
