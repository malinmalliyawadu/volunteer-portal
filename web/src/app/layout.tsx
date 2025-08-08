import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Everybody Eats Volunteer Portal",
  description: "Sign up for volunteer shifts",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <header className="border-b">
          <div className="bg-[var(--ee-primary)] text-white">
            <nav className="max-w-6xl mx-auto px-4 py-3 flex gap-6 items-center">
              <Link
                href="/"
                className="font-semibold tracking-tight header-link"
              >
                Everybody Eats
              </Link>
              <Link href="/shifts" className="header-link">
                Shifts
              </Link>
              <Link href="/login" className="ml-auto header-link">
                Volunteer login
              </Link>
            </nav>
          </div>
        </header>
        <main className="max-w-6xl mx-auto p-4">{children}</main>
        <footer className="border-t mt-12">
          <div className="max-w-6xl mx-auto px-4 py-8 text-sm text-[color:var(--ee-muted)]">
            <div>
              Registered charity number: CC56055 · © Everybody Eats{" "}
              {new Date().getFullYear()}
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
