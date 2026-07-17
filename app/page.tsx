import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="landing">
      <header className="landing-top">
        <div className="row">
          <span className="brand-mark">◆</span>
          <span className="brand-name mono">MOBIL</span>
        </div>
        <div className="row">
          <Link href="/login" className="btn btn-ghost btn-sm">
            로그인
          </Link>
          <Link href="/signup" className="btn btn-primary btn-sm">
            시작하기
          </Link>
        </div>
      </header>

      <main className="landing-hero">
        <span className="label">SECURE IDEA VAULT / SELF-HOSTED SaaS</span>
        <h1 className="landing-h1">
          아이디어와 자료를
          <br />
          한 곳에서 관리하는 저장소
        </h1>
        <p className="landing-sub">
          개인 및 사적, 보안 업무를 위한 작업 공간. 파일을 저장하고, 문서를
          작성·편집하고, 세밀한 권한으로 공유하세요. 모든 데이터는 행 단위 보안
          정책(RLS)으로 격리됩니다.
        </p>
        <div className="row" style={{ marginTop: 28 }}>
          <Link href="/signup" className="btn btn-primary">
            계정 만들기
          </Link>
          <Link href="/login" className="btn">
            기존 계정으로 로그인
          </Link>
        </div>

        <div className="landing-grid">
          <FeatureCard
            tag="STORAGE"
            title="파일 저장소"
            desc="업로드 · 다운로드 · 공유. 서명된 URL과 버킷 정책으로 접근을 통제합니다."
          />
          <FeatureCard
            tag="DOCS"
            title="문서 편집기"
            desc="구조화된 JSON 기반 에디터. 자동 저장과 수동 저장을 모두 지원합니다."
          />
          <FeatureCard
            tag="ACCESS"
            title="권한 관리"
            desc="사용자별 view / edit 권한. 관리자는 별도 코드로 승격됩니다."
          />
        </div>
      </main>

      <footer className="landing-foot mono">
        MOBIL — DEPLOYMENT ARCHIVE FOR INFRASTRUCTURE
      </footer>

      <style>{landingCss}</style>
    </div>
  );
}

function FeatureCard({
  tag,
  title,
  desc,
}: {
  tag: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="feature">
      <span className="label">{tag}</span>
      <div className="feature-title">{title}</div>
      <p className="feature-desc">{desc}</p>
    </div>
  );
}

const landingCss = `
.landing { min-height: 100vh; background:
  radial-gradient(1200px 600px at 50% -10%, rgba(199,70,52,0.06), transparent 60%),
  var(--bg-0); display: flex; flex-direction: column; }
.landing-top { display: flex; align-items: center; justify-content: space-between;
  padding: 16px 32px; border-bottom: 1px solid var(--border-0); }
.brand-mark { color: var(--accent); font-size: 14px; }
.brand-name { font-weight: 600; letter-spacing: 0.18em; color: var(--text-0); font-size: 14px; }
.landing-hero { flex: 1; max-width: 880px; width: 100%; margin: 0 auto;
  padding: 88px 32px 40px; }
.landing-h1 { font-size: 44px; line-height: 1.12; font-weight: 700; color: var(--text-0);
  margin: 18px 0 0; letter-spacing: -0.02em; }
.landing-sub { max-width: 620px; margin-top: 20px; font-size: 15px; color: var(--text-2);
  line-height: 1.65; }
.landing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;
  margin-top: 64px; }
.feature { padding: 18px; background: var(--bg-2); border: 1px solid var(--border-0);
  border-radius: var(--radius-lg); }
.feature-title { font-size: 15px; font-weight: 600; color: var(--text-0); margin-top: 10px; }
.feature-desc { font-size: 13px; color: var(--text-2); margin: 8px 0 0; line-height: 1.6; }
.landing-foot { padding: 20px 32px; border-top: 1px solid var(--border-0);
  font-size: 11px; letter-spacing: 0.1em; color: var(--text-3); }
@media (max-width: 720px) {
  .landing-h1 { font-size: 32px; }
  .landing-grid { grid-template-columns: 1fr; }
  .landing-hero { padding-top: 56px; }
}
`;
