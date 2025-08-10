"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";

export default function LoginPage() {
  const [email, setEmail] = useState("volunteer@example.com");
  const [password, setPassword] = useState("volunteer123");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setIsLoading(false);

    if (res?.error) {
      setError("Invalid credentials");
    } else {
      window.location.href = "/";
    }
  }

  async function handleQuickLogin(userType: "volunteer" | "admin") {
    setError(null);
    setIsLoading(true);

    const credentials = {
      volunteer: {
        email: "volunteer@example.com",
        password: "volunteer123",
      },
      admin: {
        email: "admin@everybodyeats.nz",
        password: "admin123",
      },
    };

    const { email: loginEmail, password: loginPassword } =
      credentials[userType];

    const res = await signIn("credentials", {
      email: loginEmail,
      password: loginPassword,
      redirect: false,
    });

    setIsLoading(false);

    if (res?.error) {
      setError("Login failed");
    } else {
      window.location.href = "/";
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center animate-fade-in">
      <div className="w-full max-w-md">
        <div className="text-center">
          <PageHeader
            title="Welcome back"
            description="Sign in to your volunteer account"
            className="mb-6"
          />
        </div>

        <Card className="animate-slide-up">
          <CardContent className="p-8">
            <form onSubmit={onSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email address
                </Label>
                <Input
                  id="email"
                  placeholder="Enter your email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="focus-ring"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <Input
                  id="password"
                  placeholder="Enter your password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="focus-ring"
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {error}
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full btn-primary"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 animate-spin"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Signing in...
                  </div>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-border">
              <div className="bg-accent/10 rounded-lg p-4 text-center">
                <p className="text-sm font-medium text-primary mb-3">
                  Demo Credentials
                </p>
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => handleQuickLogin("volunteer")}
                    className="w-full btn-secondary"
                    size="sm"
                    disabled={isLoading}
                  >
                    Login as Volunteer
                  </Button>
                  <Button
                    onClick={() => handleQuickLogin("admin")}
                    className="w-full btn-secondary"
                    size="sm"
                    disabled={isLoading}
                  >
                    Login as Admin
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Volunteer: volunteer@example.com | Admin:
                  admin@everybodyeats.nz
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
