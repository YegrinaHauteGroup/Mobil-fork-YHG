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
          <span className="brand-logo">Mobil</span>
        </div>
        <div className="row">
          <Link href="/login" className="btn btn-ghost btn-sm">
            Sign in
          </Link>
          <Link href="/signup" className="btn btn-primary btn-sm">
            Get started
          </Link>
        </div>
      </header>

      <main className="landing-hero">
        <span className="label">SECURE IDEA VAULT / SELF-HOSTED SaaS</span>
        <h1 className="landing-h1">
          Manage your ideas
          <br />
          and assets in one place
        </h1>
        <p className="landing-sub">
          A private workspace for personal and security work. Store files, write
          and edit documents and code, and share with fine-grained permissions.
          Every row is isolated by row-level security (RLS).
        </p>
        <div className="row" style={{ marginTop: 28 }}>
          <Link href="/signup" className="btn btn-primary">
            Create account
          </Link>
          <Link href="/login" className="btn">
            Sign in
          </Link>
        </div>

        <div className="landing-grid">
          <FeatureCard
            tag="STORAGE"
            title="File storage"
            desc="Upload, download, share. Access is controlled by signed URLs and bucket policies."
          />
          <FeatureCard
            tag="DOCS"
            title="Editor"
            desc="Rich JSON-based editor with images, video, colors and checklists. Auto and manual save."
          />
          <FeatureCard
            tag="ACCESS"
            title="Access control"
            desc="Per-user view / edit permissions. Admins are elevated via a separate code."
          />
        </div>
      </main>

      <footer className="landing-foot mono">
        Mobil — Deployment Archive for Infrastructure
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
.brand-name { font-weight: 500; letter-spacing: 0.18em; color: var(--text-0); font-size: 14px; }
.landing-hero { flex: 1; max-width: 880px; width: 100%; margin: 0 auto;
  padding: 88px 32px 40px; }
.landing-h1 { font-size: 36px; line-height: 1.15; font-weight: 600; color: var(--text-0);
  margin: 18px 0 0; letter-spacing: -0.02em; }
.landing-sub { max-width: 620px; margin-top: 20px; font-size: 15px; color: var(--text-2);
  line-height: 1.65; }
.landing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;
  margin-top: 64px; }
.feature { padding: 18px; background: var(--bg-2); border: 1px solid var(--border-0);
  border-radius: var(--radius-lg); }
.feature-title { font-size: 14px; font-weight: 500; color: var(--text-0); margin-top: 10px; }
.feature-desc { font-size: 13px; color: var(--text-2); margin: 8px 0 0; line-height: 1.6; }
.landing-foot { padding: 20px 32px; border-top: 1px solid var(--border-0);
  font-size: 11px; letter-spacing: 0.1em; color: var(--text-3); }
@media (max-width: 720px) {
  .landing-h1 { font-size: 32px; }
  .landing-grid { grid-template-columns: 1fr; }
  .landing-hero { padding-top: 56px; }
}
`;
