import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  description: "Sign up for volunteer shifts",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

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
              {session?.user ? (
                <Link href="/shifts/mine" className="header-link">
                  My shifts
                </Link>
              ) : null}
              {(session?.user as { role?: "ADMIN" } | undefined)?.role ===
              "ADMIN" ? (
                <Link href="/admin/shifts" className="header-link">
                  Admin
                </Link>
              ) : null}
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
