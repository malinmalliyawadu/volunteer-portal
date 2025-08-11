"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Session } from "next-auth";

interface SiteFooterProps {
  session?: Session | null;
}

/**
 * Site footer component displaying charity information, navigation links, and registration CTA
 *
 * @example
 * ```tsx
 * <SiteFooter session={session} />
 * ```
 */
export function SiteFooter({ session }: SiteFooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t mt-12 bg-slate-900 dark:bg-slate-950">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Main footer content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* About section */}
          <div>
            <h3 className="text-white font-semibold mb-4">Everybody Eats</h3>
            <p className="text-slate-300 text-sm leading-relaxed mb-4">
              Transforming rescued food into quality 3-course meals on a
              pay-what-you-can basis, reducing food waste and social isolation
              in Aotearoa.
            </p>
            <p className="text-slate-400 text-xs">
              Registered charity number:{" "}
              <span className="font-medium text-slate-300">CC56055</span>
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <nav className="space-y-2">
              <Link
                href="/shifts"
                className="block text-slate-300 hover:text-white text-sm transition-colors"
              >
                Browse Shifts
              </Link>
              {session?.user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="block text-slate-300 hover:text-white text-sm transition-colors"
                  >
                    My Dashboard
                  </Link>
                  <Link
                    href="/profile"
                    className="block text-slate-300 hover:text-white text-sm transition-colors"
                  >
                    My Profile
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="block text-slate-300 hover:text-white text-sm transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="block text-slate-300 hover:text-white text-sm transition-colors"
                  >
                    Join as Volunteer
                  </Link>
                </>
              )}
            </nav>
          </div>

          {/* Call to action for non-logged-in users */}
          {!session?.user && (
            <div>
              <h3 className="text-white font-semibold mb-4">
                Ready to Volunteer?
              </h3>
              <p className="text-slate-300 text-sm mb-4">
                Join our community of volunteers and help make a difference in
                your local community.
              </p>
              <div className="space-y-2">
                <Button asChild className="w-full">
                  <Link href="/register">Get Started Today</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full bg-transparent text-slate-300 border-slate-600 hover:bg-slate-800 hover:text-white"
                >
                  <Link href="/shifts">Browse Opportunities</Link>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom footer */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-8 border-t border-slate-700">
          <div className="text-sm text-slate-400">
            <p>© Everybody Eats {currentYear}. All rights reserved.</p>
          </div>
          <div className="text-sm text-slate-400">
            <p>Making a difference, one meal at a time.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default SiteFooter;
