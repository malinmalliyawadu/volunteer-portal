import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { RestaurantManagersContent } from "./restaurant-managers-content";
import { AdminPageWrapper } from "@/components/admin-page-wrapper";

export default async function RestaurantManagersPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;

  if (!session?.user) {
    redirect("/login?callbackUrl=/admin/restaurant-managers");
  }
  if (role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <AdminPageWrapper 
      title="Restaurant Manager Assignments" 
      description="Assign admins to restaurant locations to receive shift cancellation notifications."
    >
      <div className="space-y-6">
        <RestaurantManagersContent />
      </div>
    </AdminPageWrapper>
  );
}
