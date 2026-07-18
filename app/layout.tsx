import type { Metadata, Viewport } from "next";
import { Noto_Sans } from "next/font/google";
import "./globals.css";

// 라틴 자소는 Noto Sans 를 self-host(빌드시 번들)로 로드하고,
// 한글은 시스템 한글 폰트로 폴백한다(대형 CJK 웹폰트 미전송 → 최적화).
const notoSans = Noto_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-noto",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mobil",
  description: "A private idea vault for personal and security work — files, documents and code in one place",
};

// 편집기(문서/코드/시트) 사용 중 핀치·더블탭 확대가 걸려 타이핑을 방해하지
// 않도록 PC/태블릿/모바일 전부에서 확대를 막는다.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={notoSans.variable}>
      <body>{children}</body>
    </html>
  );
}
