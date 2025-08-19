import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth-options";
import { PageContainer } from "@/components/page-container";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { getFriendsData } from "@/lib/friends-data";
import { FriendsManagerServer } from "@/components/friends-manager-server";
import { BarChart3 } from "lucide-react";
import ErrorBoundary from "@/components/error-boundary";
import { FriendsErrorFallback } from "@/components/friends-error-fallback";

export default async function FriendsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Fetch friends data server-side
  const friendsData = await getFriendsData();

  if (!friendsData) {
    redirect("/login");
  }

  return (
    <PageContainer>
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <PageHeader
          title="My Friends"
          description="Manage your friends and discover volunteering opportunities together"
          className="flex-1"
        />
        <Button asChild variant="outline" className="w-fit">
          <Link href="/friends/stats" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            View Statistics
          </Link>
        </Button>
      </div>
      <ErrorBoundary fallback={FriendsErrorFallback}>
        <Suspense
          fallback={
            <div className="flex justify-center py-8">Loading friends...</div>
          }
        >
          <FriendsManagerServer initialData={friendsData} />
        </Suspense>
      </ErrorBoundary>
    </PageContainer>
  );
}
