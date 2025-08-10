"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { Session } from "next-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

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
                className={getLinkClassName(
                  (session.user as { role?: "ADMIN" | "VOLUNTEER" } | undefined)
                    ?.role === "ADMIN"
                    ? "/admin"
                    : "/dashboard"
                )}
              >
                <Link
                  href={
                    (
                      session.user as
                        | { role?: "ADMIN" | "VOLUNTEER" }
                        | undefined
                    )?.role === "ADMIN"
                      ? "/admin"
                      : "/dashboard"
                  }
                >
                  Dashboard
                </Link>
              </Button>
            ) : null}

            <Button
              asChild
              variant="ghost"
              className={getLinkClassName("/shifts")}
            >
              <Link href="/shifts">Shifts</Link>
            </Button>

            {session?.user ? (
              <Button
                asChild
                variant="ghost"
                className={getLinkClassName("/shifts/mine")}
              >
                <Link href="/shifts/mine">My shifts</Link>
              </Button>
            ) : null}

            {(session?.user as { role?: "ADMIN" } | undefined)?.role ===
            "ADMIN" ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "text-white/90 hover:text-white hover:bg-white/10",
                      (pathname.startsWith("/admin") ||
                        pathname === "/admin") &&
                        "text-white bg-white/20 font-medium"
                    )}
                  >
                    Admin
                    <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="cursor-pointer">
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/admin/shifts" className="cursor-pointer">
                      Manage Shifts
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/admin/users" className="cursor-pointer">
                      Manage Users
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
