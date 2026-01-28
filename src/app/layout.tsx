import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TODO × Calendar × Map",
  description: "Portfolio app: visualize when/where/what to do",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}