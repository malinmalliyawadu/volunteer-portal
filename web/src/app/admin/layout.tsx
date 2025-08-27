import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin-sidebar";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login?callbackUrl=/admin");
  }

  const role = session?.user?.role;
  if (role !== "ADMIN") {
    redirect("/dashboard");
  }

  // Fetch user profile data
  let userProfile = null;
  if (session?.user?.email) {
    userProfile = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        profilePhotoUrl: true,
        name: true,
        firstName: true,
        lastName: true,
      },
    });
  }

  // Determine display name
  let displayName = "Admin";
  if (userProfile?.name) {
    displayName = userProfile.name;
  } else if (userProfile?.firstName || userProfile?.lastName) {
    displayName = [userProfile.firstName, userProfile.lastName]
      .filter(Boolean)
      .join(" ");
  } else if (session.user.email) {
    displayName = session.user.email.split("@")[0];
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <AdminSidebar
        session={session}
        userProfile={userProfile}
        displayName={displayName}
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-background rounded-t-xl">
          <SidebarTrigger />
          <div className="h-4 w-px bg-border mx-2" />
          <h1 className="text-lg font-semibold">Admin Panel</h1>
        </header>
        <div className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
