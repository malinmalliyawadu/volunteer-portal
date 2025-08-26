import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import RestaurantManagersClient from "./restaurant-managers-client";

export default async function RestaurantManagersPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: "ADMIN" | "VOLUNTEER" } | undefined)?.role;

  if (!session?.user) {
    redirect("/login?callbackUrl=/admin/restaurant-managers");
  }
  if (role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight" data-testid="page-heading">Restaurant Manager Assignments</h1>
        <p className="text-muted-foreground">
          Assign admins to restaurant locations to receive shift cancellation notifications.
        </p>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <RestaurantManagersClient />
      </Suspense>
    </div>
  );
}