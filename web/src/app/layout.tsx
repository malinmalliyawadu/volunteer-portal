import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import Image from "next/image";
import "./globals.css";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";

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
            <nav
              aria-label="Main"
              className="max-w-6xl mx-auto px-4 py-6 flex items-center gap-3"
            >
              <Link href="/" className="flex items-center gap-2 cursor-pointer">
                <Image
                  src="/logo.svg"
                  alt="Everybody Eats"
                  width={240}
                  height={88}
                  priority
                  className="h-12 w-auto"
                />
                <span className="sr-only">Everybody Eats logo</span>
              </Link>

              <div className="ml-2 hidden md:flex items-center gap-1">
                <Button
                  asChild
                  variant="ghost"
                  className="text-white/90 hover:text-white hover:bg-white/10"
                >
                  <Link href="/shifts">Shifts</Link>
                </Button>
                {session?.user ? (
                  <Button
                    asChild
                    variant="ghost"
                    className="text-white/90 hover:text-white hover:bg-white/10"
                  >
                    <Link href="/shifts/mine">My shifts</Link>
                  </Button>
                ) : null}
                {(session?.user as { role?: "ADMIN" } | undefined)?.role ===
                "ADMIN" ? (
                  <Button
                    asChild
                    variant="ghost"
                    className="text-white/90 hover:text-white hover:bg-white/10"
                  >
                    <Link href="/admin/shifts">Admin</Link>
                  </Button>
                ) : null}
              </div>

              <div className="ml-auto">
                {session?.user ? (
                  <UserMenu
                    userName={
                      ((
                        session.user as {
                          name?: string | null;
                          email?: string | null;
                        }
                      )?.name ??
                        (session.user as { email?: string | null })?.email ??
                        "Account") as string
                    }
                  />
                ) : (
                  <Button
                    asChild
                    variant="outline"
                    className="bg-transparent text-white border-white/40 hover:bg-white/10 hover:text-white"
                  >
                    <Link href="/login">Volunteer login</Link>
                  </Button>
                )}
              </div>
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
