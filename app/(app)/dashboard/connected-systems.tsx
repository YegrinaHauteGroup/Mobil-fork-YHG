import "./connected-systems.css";
import { LogoSupabase, LogoVercel, LogoNvidia, LogoOracle } from "./brand-logos";

type SystemStatus = "connected" | "not-configured" | "coming-soon";

type SystemInfo = {
  key: string;
  name: string;
  logo: React.ReactNode;
  status: SystemStatus;
  statusLabel: string;
  details: string[];
};

function supabaseProjectHost(): string | null {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return url ? new URL(url).hostname : null;
  } catch {
    return null;
  }
}

/** 각 카드는 장식이 아니라 실제 서버 환경 상태를 반영한다 — 키/URL 이 실제로
 * 설정돼 있는지를 그대로 확인해 "Connected"/"Not configured" 를 결정한다. */
export function ConnectedSystems() {
  const supabaseHost = supabaseProjectHost();
  const nvidiaConfigured = !!(process.env.NVIDIA_API_KEY || process.env.NVIDIA_API_KEY_2);
  const onVercel = !!process.env.VERCEL;

  const systems: SystemInfo[] = [
    {
      key: "supabase",
      name: "Supabase",
      logo: <LogoSupabase size={26} />,
      status: supabaseHost ? "connected" : "not-configured",
      statusLabel: supabaseHost ? "Connected" : "Not configured",
      details: [
        "Postgres 17 · Auth · Storage · Realtime",
        "Region: ap-northeast-2 (Seoul)",
        ...(supabaseHost ? [`Project: ${supabaseHost}`] : []),
      ],
    },
    {
      key: "vercel",
      name: "Vercel",
      logo: <LogoVercel size={26} />,
      status: onVercel ? "connected" : "not-configured",
      statusLabel: onVercel ? "Connected" : "Not detected",
      details: ["Edge & Serverless Functions", "Region: icn1 (Seoul)"],
    },
    {
      key: "nvidia",
      name: "NVIDIA AI",
      logo: <LogoNvidia size={26} />,
      status: nvidiaConfigured ? "connected" : "not-configured",
      statusLabel: nvidiaConfigured ? "Connected" : "Not configured",
      details: ["Model: meta/llama-3.3-70b-instruct", "Powers Sophia"],
    },
    {
      key: "oracle",
      name: "Oracle",
      logo: <LogoOracle size={26} />,
      status: "coming-soon",
      statusLabel: "Coming soon",
      details: ["Infrastructure — planned integration"],
    },
  ];

  return (
    <div className="panel" style={{ marginBottom: 24 }}>
      <div className="panel-header">
        <span className="label">CONNECTED SYSTEMS</span>
      </div>
      <div className="panel-body">
        <div className="sys-grid">
          {systems.map((s) => (
            <div key={s.key} className={`sys-card sys-card-${s.status}`}>
              <div className="sys-card-top">
                <span className="sys-logo">{s.logo}</span>
                <div className="sys-card-name-wrap">
                  <span className="sys-name">{s.name}</span>
                  <span className="sys-status">
                    <span className={`sys-dot sys-dot-${s.status}`} />
                    {s.statusLabel}
                  </span>
                </div>
              </div>
              <ul className="sys-details">
                {s.details.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
