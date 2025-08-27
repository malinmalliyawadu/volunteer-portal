import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { RestaurantManagersContent } from "./restaurant-managers-content";

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
    <div className="space-y-6">
      <PageHeader
        title="Restaurant Manager Assignments"
        description="Assign admins to restaurant locations to receive shift cancellation notifications."
      />

      <RestaurantManagersContent />
    </div>
  );
}