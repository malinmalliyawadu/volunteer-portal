import { prisma } from "@/lib/prisma";
import ProfileEditClient from "./profile-edit-client";

/**
 * Server component for profile editing page that fetches shift types
 */
export default async function EditProfilePage() {
  // Fetch shift types on the server
  const shiftTypes = await prisma.shiftType.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return <ProfileEditClient shiftTypes={shiftTypes} />;
}