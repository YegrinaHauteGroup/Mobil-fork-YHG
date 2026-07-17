import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mobil",
  description: "개인 및 보안 업무를 위한 아이디어 저장소 — 파일과 문서를 한 곳에서",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
