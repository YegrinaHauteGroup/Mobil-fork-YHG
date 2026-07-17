import Link from "next/link";
import "../auth.css";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark">◆</span>
          <span className="brand-name mono">MOBIL</span>
        </div>
        <div className="auth-panel">
          <h1 className="auth-h">회원가입</h1>
          <p className="auth-desc">
            이메일과 비밀번호로 새 저장소 계정을 생성합니다.
          </p>
          <SignupForm />
        </div>
        <div className="auth-foot">
          이미 계정이 있나요? <Link href="/login">로그인</Link>
        </div>
      </div>
    </div>
  );
}
