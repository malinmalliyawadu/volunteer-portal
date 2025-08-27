import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { NotificationsContent } from "./notifications-content";

export const metadata: Metadata = {
  title: "Shift Shortage Notifications | Admin",
  description: "Send shift shortage notifications to volunteers",
};

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Shift Shortage Notifications</h1>
      <NotificationsContent />
    </div>
  );
}