// 대시보드 "연결된 시스템" 카드용 브랜드 마크. 각 서비스의 실제 로고 파일을
// 그대로 쓰는 대신, 알아보기 쉬운 형태로 단순화해 currentColor/브랜드 컬러로
// 다시 그렸다 — 이름은 항상 텍스트로도 같이 표기하므로 식별에는 문제없다.
type P = { size?: number };

export function LogoSupabase({ size = 24 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M13.6 2 4.2 14.4a1 1 0 0 0 .8 1.6h6.2L10.4 22l9.4-12.4a1 1 0 0 0-.8-1.6h-6.2L13.6 2Z"
        fill="#3ECF8E"
      />
    </svg>
  );
}

export function LogoVercel({ size = 24 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 3 22.5 21H1.5L12 3Z" fill="var(--text-0)" />
    </svg>
  );
}

export function LogoNvidia({ size = 24 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M4 15.5c3-7 6.2-9.2 8-9.2s5 2.2 8 9.2c-3-3.1-6.2-4.2-8-4.2s-5 1.1-8 4.2Z"
        fill="#76B900"
      />
    </svg>
  );
}

export function LogoOracle({ size = 24 }: P) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--text-3)"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="12" cy="5.2" rx="7" ry="2.4" />
      <path d="M5 5.2v13.6c0 1.3 3.1 2.4 7 2.4s7-1.1 7-2.4V5.2" />
      <path d="M5 12c0 1.3 3.1 2.4 7 2.4s7-1.1 7-2.4" />
    </svg>
  );
}
