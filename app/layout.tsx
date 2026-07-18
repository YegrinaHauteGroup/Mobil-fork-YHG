import type { Metadata } from "next";
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
