import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { PageContainer } from "@/components/page-container";
import { ContentGrid, BottomGrid } from "@/components/dashboard-animated";
import AchievementsCard from "@/components/achievements-card";
import { DashboardStats } from "@/components/dashboard-stats";
import { DashboardNextShift } from "@/components/dashboard-next-shift";
import { DashboardRecentActivity } from "@/components/dashboard-recent-activity";
import { DashboardStatsSkeleton } from "@/components/dashboard-stats-skeleton";
import { DashboardContentSkeleton } from "@/components/dashboard-content-skeleton";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const userName = (session?.user as { name?: string } | undefined)?.name;

  if (!userId) {
    redirect("/login?callbackUrl=/dashboard");
  }

  return (
    <PageContainer testid="dashboard-page">
      {/* Header renders immediately */}
      <PageHeader
        title={`Welcome back${userName ? `, ${userName}` : ""}!`}
        description="Here's what's happening with your volunteer journey"
      />

      {/* Stats Overview - streams in when ready */}
      <Suspense fallback={<DashboardStatsSkeleton />}>
        <DashboardStats userId={userId} userName={userName} />
      </Suspense>

      <ContentGrid>
        {/* Next Shift - streams in when ready */}
        <Suspense fallback={<DashboardContentSkeleton />}>
          <DashboardNextShift userId={userId} />
        </Suspense>

        {/* Recent Activity - streams in when ready */}
        <Suspense fallback={<DashboardContentSkeleton />}>
          <DashboardRecentActivity userId={userId} />
        </Suspense>
      </ContentGrid>

      <BottomGrid>
        {/* Achievements - streams in when ready */}
        <Suspense fallback={<DashboardContentSkeleton />}>
          <AchievementsCard />
        </Suspense>
      </BottomGrid>
    </PageContainer>
  );
}
