import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ATOOL — AI Campus OS",
  description: "AI-powered campus operating system for students and faculty.",
};

/**
 * Runs before first paint: restores the saved day/night preference.
 * Default is day mode; night mode is `<html class="dark">`.
 */
const themeInit = `(function(){try{var t=localStorage.getItem("atool-theme");document.documentElement.classList.toggle("dark",t==="dark")}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
