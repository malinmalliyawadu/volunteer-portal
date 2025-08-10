"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { Session } from "next-auth";

interface SiteHeaderProps {
  session: Session | null;
  userProfile: {
    profilePhotoUrl?: string | null;
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  displayName: string;
}

export function SiteHeader({
  session,
  userProfile,
  displayName,
}: SiteHeaderProps) {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path;
  };

  const getLinkClassName = (path: string) => {
    return cn(
      "text-white/90 hover:text-white hover:bg-white/10",
      isActive(path) && "text-white bg-white/20 font-medium"
    );
  };

  const isAdmin =
    (session?.user as { role?: "ADMIN" } | undefined)?.role === "ADMIN";

  return (
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
            {session?.user ? (
              <Button
                asChild
                variant="ghost"
                className={getLinkClassName(isAdmin ? "/admin" : "/dashboard")}
              >
                <Link href={isAdmin ? "/admin" : "/dashboard"}>Dashboard</Link>
              </Button>
            ) : null}

            <Button
              asChild
              variant="ghost"
              className={getLinkClassName("/shifts")}
            >
              <Link href="/shifts">Shifts</Link>
            </Button>

            {session?.user && !isAdmin ? (
              <Button
                asChild
                variant="ghost"
                className={getLinkClassName("/shifts/mine")}
              >
                <Link href="/shifts/mine">My shifts</Link>
              </Button>
            ) : null}

            {isAdmin ? (
              <>
                <Button
                  asChild
                  variant="ghost"
                  className={getLinkClassName("/admin/shifts")}
                >
                  <Link href="/admin/shifts">Manage Shifts</Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  className={getLinkClassName("/admin/users")}
                >
                  <Link href="/admin/users">Manage Users</Link>
                </Button>
              </>
            ) : null}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            {session?.user ? (
              <UserMenu
                userName={displayName}
                userEmail={
                  (session.user as { email?: string | null })?.email ??
                  undefined
                }
                profilePhotoUrl={userProfile?.profilePhotoUrl}
              />
            ) : (
              <Button
                asChild
                variant="outline"
                className="bg-transparent text-white border-white/40 hover:bg-white/10 hover:text-white"
              >
                <Link href="/login">Login</Link>
              </Button>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
