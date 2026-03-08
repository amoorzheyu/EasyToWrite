import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EasyToWrite - PDF 手写注释工具",
  description: "在 PDF 上框选区域并填入手写风格文字，支持字体与手写参数调节，导出带手写内容的 PDF",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
