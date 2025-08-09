import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div>
      <section className="bg-[var(--ee-bg)]">
        <div className="max-w-6xl mx-auto px-4 py-16 grid gap-6 md:grid-cols-2 md:items-center">
          <div>
            <p className="uppercase text-sm tracking-wide text-[color:var(--ee-accent)] mb-2">
              Meals that matter
            </p>
            <h1 className="text-4xl md:text-5xl font-semibold leading-tight mb-4">
              Making a difference one plate at a time
            </h1>
            <p className="text-[color:var(--ee-muted)] mb-6">
              Everybody Eats is an innovative, charitable restaurant,
              transforming rescued food into quality 3-course meals on a
              pay-what-you-can basis. Join us and be part of reducing food
              waste, food insecurity and social isolation in Aotearoa.
            </p>
            <div className="flex gap-3">
              <Button asChild>
                <Link href="/shifts">Volunteer shifts</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/login">Volunteer login</Link>
              </Button>
            </div>
          </div>
          <div className="hidden md:block" aria-hidden>
            <div
              className="aspect-[4/3] w-full rounded overflow-hidden border"
              style={{ borderColor: "var(--ee-border)" }}
            >
              <div className="h-full w-full bg-[var(--ee-primary)]/10" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
