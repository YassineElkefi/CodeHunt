import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { RealtimeProvider } from "../context/RealtimeContext";
import { ThemeProvider } from "../context/ThemeContext";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CodeHunt",
  description: "A 2-player Bulls & Cows code deduction game.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <ThemeProvider>
          <RealtimeProvider>
            <div className="min-h-screen flex flex-col">
              <main className="flex-1 flex flex-col">{children}</main>
              <footer className="border-t border-[var(--color-border-tertiary)] bg-[var(--color-background-primary)] px-4 py-3 text-center text-xs text-[var(--color-text-secondary)]">
                © 2026 - made with ❤️ by Yassine              
              </footer>
            </div>
          </RealtimeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}