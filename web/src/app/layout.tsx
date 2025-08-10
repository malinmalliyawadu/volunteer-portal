import type { Metadata } from "next";
import { Libre_Franklin, Fraunces } from "next/font/google";
import "./globals.css";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";

const libreFranklin = Libre_Franklin({
  variable: "--font-libre-franklin",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK"],
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

  // Fetch user profile data including profile photo
  let userProfile = null;
  if (session?.user?.email) {
    userProfile = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        profilePhotoUrl: true,
        name: true,
        firstName: true,
        lastName: true,
      },
    });
  }

  // Use profile name if available, otherwise fall back to session name/email
  const displayName =
    userProfile?.name ||
    (session?.user as { name?: string | null })?.name ||
    (session?.user as { email?: string | null })?.email ||
    "Account";

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Volunteer Portal - Everybody Eats</title>
        <link href="/favicon.jpg" rel="shortcut icon" type="image/x-icon" />
      </head>
      <body
        className={`${libreFranklin.variable} ${fraunces.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SiteHeader
            session={session}
            userProfile={userProfile}
            displayName={displayName}
          />
          <main className="max-w-6xl mx-auto p-4">{children}</main>
          <SiteFooter />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
