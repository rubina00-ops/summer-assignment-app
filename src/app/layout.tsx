import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "나의 방학 생활 이야기",
  description: "우리 반 여름방학 과제 공유 앱",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
