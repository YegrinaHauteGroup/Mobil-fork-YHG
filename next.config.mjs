/**
 * Content-Security-Policy
 * - connect-src: 자기 자신 + Supabase(REST/Storage/Realtime)만 허용 → 데이터 유출 경로 제한
 * - frame-ancestors 'none' + object-src 'none' + base-uri 'self': 클릭재킹/베이스 변조 차단
 * - style-src 'unsafe-inline': Tiptap/CodeMirror 및 인라인 스타일에 필요(스크립트는 self 우선)
 * CodeMirror/ProseMirror 는 eval/worker 를 사용하지 않으므로 unsafe-eval 불필요.
 */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "worker-src 'self' blob:",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,
  experimental: {
    // 대형 CodeMirror/Tiptap 임포트를 트리셰이킹 친화적으로 최적화
    optimizePackageImports: [
      "@codemirror/view",
      "@codemirror/state",
      "@codemirror/language",
      "@tiptap/react",
      "@tiptap/starter-kit",
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
