import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { PageContainer } from "@/components/page-container";
import { PageHeader } from "@/components/page-header";
import { getFriendsData } from "@/lib/friends-data";
import { FriendsManagerServer } from "@/components/friends-manager-server";

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
      <PageHeader
        title="My Friends"
        description="Manage your friends and discover volunteering opportunities together"
      />
      <Suspense
        fallback={
          <div className="flex justify-center py-8">Loading friends...</div>
        }
      >
        <FriendsManagerServer initialData={friendsData} />
      </Suspense>
    </PageContainer>
  );
}
