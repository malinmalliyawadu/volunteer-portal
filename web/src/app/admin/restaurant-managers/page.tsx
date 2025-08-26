import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import RestaurantManagersTable from "./restaurant-managers-table";
import RestaurantManagerForm from "./restaurant-manager-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function RestaurantManagersPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Restaurant Manager Assignments</h1>
        <p className="text-muted-foreground">
          Assign admins to restaurant locations to receive shift cancellation notifications.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assignment Form */}
        <Card>
          <CardHeader>
            <CardTitle>Assign Restaurant Manager</CardTitle>
            <CardDescription>
              Select an admin user and assign them to restaurant locations for notifications.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div>Loading form...</div>}>
              <RestaurantManagerForm />
            </Suspense>
          </CardContent>
        </Card>

        {/* Current Assignments */}
        <Card>
          <CardHeader>
            <CardTitle>Current Assignments</CardTitle>
            <CardDescription>
              View and manage existing restaurant manager assignments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div>Loading assignments...</div>}>
              <RestaurantManagersTable />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}