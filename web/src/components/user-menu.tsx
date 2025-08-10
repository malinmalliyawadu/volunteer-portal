"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type UserMenuProps = {
  userName: string;
  userEmail?: string;
  profilePhotoUrl?: string | null;
};

export function UserMenu({
  userName,
  userEmail,
  profilePhotoUrl,
}: UserMenuProps) {
  const initials = userName
    .split(" ")
    .map((name) => name.charAt(0))
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-10 w-auto px-3 bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:text-white rounded-full transition-all duration-200"
        >
          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8 -ml-2 border border-white/20">
              <AvatarImage
                src={profilePhotoUrl || undefined}
                alt="Profile"
                className="object-cover"
              />
              <AvatarFallback className="text-sm font-semibold bg-white/20 text-white backdrop-blur-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:block text-sm font-medium">
              {userName}
            </span>
            <svg
              className="w-4 h-4 opacity-60"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-2">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5">
          <Avatar className="w-10 h-10 border-2 border-primary/20">
            <AvatarImage
              src={profilePhotoUrl || undefined}
              alt="Profile"
              className="object-cover"
            />
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary-700 text-white font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <DropdownMenuLabel className="p-0 font-semibold text-foreground">
              {userName}
            </DropdownMenuLabel>
            {userEmail && (
              <p className="text-xs text-muted-foreground truncate">
                {userEmail}
              </p>
            )}
          </div>
        </div>

        <DropdownMenuSeparator className="my-2" />

        <DropdownMenuItem asChild className="cursor-pointer">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-primary/5 transition-colors"
          >
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <svg
                className="w-4 h-4 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <div>
              <div className="font-medium">Dashboard</div>
              <div className="text-xs text-muted-foreground">
                Your volunteer overview
              </div>
            </div>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild className="cursor-pointer">
          <Link
            href="/profile"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-primary/5 transition-colors"
          >
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <svg
                className="w-4 h-4 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <div>
              <div className="font-medium">Profile</div>
              <div className="text-xs text-muted-foreground">
                Manage your account
              </div>
            </div>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild className="cursor-pointer">
          <Link
            href="/shifts/mine"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-primary/5 transition-colors"
          >
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <svg
                className="w-4 h-4 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <div className="font-medium">My Shifts</div>
              <div className="text-xs text-muted-foreground">
                View your schedule
              </div>
            </div>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-2" />

        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: "/" })}
          className="cursor-pointer flex items-center gap-3 p-3 rounded-lg hover:bg-red-50 focus:bg-red-50 text-red-600 focus:text-red-600 transition-colors"
        >
          <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
            <svg
              className="w-4 h-4 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </div>
          <div>
            <div className="font-medium">Sign out</div>
            <div className="text-xs opacity-75">Sign out of your account</div>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
