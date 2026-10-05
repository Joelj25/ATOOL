import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ATOOL — AI Campus OS",
  description: "AI-powered campus operating system for students and faculty.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
