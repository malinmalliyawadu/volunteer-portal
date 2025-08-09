import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import Image from "next/image";
import { PageHeader } from "@/components/page-header";

export default async function Home() {
  const session = await getServerSession(authOptions);

  // Redirect logged-in users to their appropriate dashboard
  if (session?.user) {
    const userRole = (
      session.user as { role?: "ADMIN" | "VOLUNTEER" } | undefined
    )?.role;

    if (userRole === "ADMIN") {
      redirect("/admin");
    } else {
      redirect("/dashboard");
    }
  }

  return (
    <div className="animate-fade-in">
      <section className="section-hero">
        <div className="max-w-6xl mx-auto px-4 py-20 grid gap-8 md:grid-cols-2 md:items-center">
          <div className="animate-slide-up">
            <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6 text-foreground">
              Making a difference one plate at a time
            </h1>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Everybody Eats is an innovative, charitable restaurant,
              transforming rescued food into quality 3-course meals on a
              pay-what-you-can basis. Join us and be part of reducing food
              waste, food insecurity and social isolation in Aotearoa.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="btn-primary group">
                <Link href="/shifts" className="flex items-center gap-2">
                  <span>Browse volunteer shifts</span>
                  <svg
                    className="w-4 h-4 transition-transform group-hover:translate-x-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="btn-outline"
              >
                <Link href="/login">Volunteer login</Link>
              </Button>
            </div>
          </div>
          <div
            className="hidden md:block animate-slide-up"
            style={{ animationDelay: "0.2s" }}
          >
            <div className="relative">
              <div
                className="aspect-[4/3] w-full rounded-2xl overflow-hidden border-2 shadow-2xl"
                style={{ borderColor: "var(--ee-border)" }}
              >
                <Image
                  src="/hero.jpg"
                  alt="People enjoying meals together at Everybody Eats restaurant"
                  fill
                  className="object-cover rounded-2xl"
                  priority
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-content py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div
              className="text-center p-6 card animate-slide-up"
              style={{ animationDelay: "0.3s" }}
            >
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Community Impact</h3>
              <p className="text-muted-foreground">
                Join hundreds of volunteers making a real difference in our
                communities across New Zealand.
              </p>
            </div>

            <div
              className="text-center p-6 card animate-slide-up"
              style={{ animationDelay: "0.4s" }}
            >
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">
                Flexible Scheduling
              </h3>
              <p className="text-muted-foreground">
                Choose shifts that fit your schedule. From prep work to service,
                find opportunities that work for you.
              </p>
            </div>

            <div
              className="text-center p-6 card animate-slide-up"
              style={{ animationDelay: "0.5s" }}
            >
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Meaningful Work</h3>
              <p className="text-muted-foreground">
                Help fight food waste and food insecurity while building
                connections in your local community.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section-content py-16">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <PageHeader
            title="Welcome to Everybody Eats Volunteer Portal"
            description="Join our community of volunteers and help make a difference by signing up for volunteer shifts."
          />

          {/* Dark Mode Demo Card */}
          <div className="card p-6 mx-auto max-w-md">
            <h3 className="text-xl font-semibold mb-4">🌙 Dark Mode Support</h3>
            <p className="text-muted-foreground mb-4">
              This portal now supports dark mode! Click the theme toggle in the
              header to switch between light, dark, and system themes.
            </p>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 bg-primary rounded-full"></div>
              <div className="w-4 h-4 bg-accent rounded-full"></div>
              <div className="w-4 h-4 bg-muted rounded-full"></div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {session?.user ? (
              <>
                <Button asChild size="lg" className="btn-primary">
                  <Link href="/shifts">Browse Available Shifts</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/dashboard">View My Dashboard</Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild size="lg" className="btn-primary">
                  <Link href="/shifts">Browse Available Shifts</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/login">Volunteer Login</Link>
                </Button>
              </>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="card p-6">
              <h3 className="text-xl font-semibold mb-4">🍽️ Community Meals</h3>
              <p className="text-muted-foreground">
                Help prepare and serve meals for our community members in need.
              </p>
            </div>

            <div className="card p-6">
              <h3 className="text-xl font-semibold mb-4">
                📦 Food Distribution
              </h3>
              <p className="text-muted-foreground">
                Assist with organizing and distributing food packages to
                families.
              </p>
            </div>

            <div className="card p-6">
              <h3 className="text-xl font-semibold mb-4">🤝 Event Support</h3>
              <p className="text-muted-foreground">
                Join our team for special events and community outreach
                programs.
              </p>
            </div>
          </div>

          <div className="mt-16 p-8 bg-primary-light rounded-xl">
            <h2 className="text-2xl font-semibold mb-4">
              Ready to Make a Difference?
            </h2>
            <p className="text-muted-foreground mb-6">
              Every volunteer hour contributes to stronger, more connected
              communities. Join us in our mission to ensure everybody eats.
            </p>
            {!session?.user && (
              <Button asChild size="lg" className="btn-primary">
                <Link href="/login">Get Started</Link>
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
