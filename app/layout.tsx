import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#080607",
};

export const metadata: Metadata = {
  title: "白厄：逐火残响",
  description: "白厄像素横版动作同人游戏",
  manifest: "/manifest.webmanifest",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <script src="/asset-bridge.js" />
      </head>
      <body>
        {children}
        <div className="rotate-device">
          <span>↻</span>
          <b>请将手机横过来</b>
          <small>横屏可获得完整战斗视野</small>
        </div>
      </body>
    </html>
  );
}
