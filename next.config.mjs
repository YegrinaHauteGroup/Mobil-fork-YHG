/**
 * 보안 헤더(CSP 포함)는 middleware.ts 에서 경로별로 적용한다.
 * (이유: lib/security-headers.ts 상단 주석 참고)
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,
  experimental: {
    // 대형 CodeMirror/Tiptap/fortune-sheet 임포트를 트리셰이킹 친화적으로 최적화
    optimizePackageImports: [
      "@codemirror/view",
      "@codemirror/state",
      "@codemirror/language",
      "@tiptap/react",
      "@tiptap/starter-kit",
    ],
  },
};

export default nextConfig;
