"use client";

import { useSession } from "next-auth/react";
import { SiteHeader } from "./site-header";
import { useEffect, useState } from "react";

interface SiteHeaderWrapperProps {
  initialUserProfile: {
    id: string;
    profilePhotoUrl?: string | null;
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
}

export function SiteHeaderWrapper({ initialUserProfile }: SiteHeaderWrapperProps) {
  const { data: session, status } = useSession();
  const [userProfile, setUserProfile] = useState(initialUserProfile);

  // Fetch updated user profile when session changes
  useEffect(() => {
    if (session?.user?.email && status === "authenticated") {
      // Fetch fresh user profile data
      fetch("/api/profile")
        .then((res) => res.json())
        .then((data) => {
          if (data.user) {
            setUserProfile({
              id: data.user.id,
              profilePhotoUrl: data.user.profilePhotoUrl,
              name: data.user.name,
              firstName: data.user.firstName,
              lastName: data.user.lastName,
            });
          }
        })
        .catch((error) => {
          console.error("Failed to fetch user profile:", error);
        });
    } else if (status === "unauthenticated") {
      setUserProfile(null);
    }
  }, [session, status]);

  // Use profile name if available, otherwise fall back to session name/email
  const displayName =
    userProfile?.name ||
    (session?.user as { name?: string | null })?.name ||
    (session?.user as { email?: string | null })?.email ||
    "Account";

  return (
    <SiteHeader
      session={session}
      userProfile={userProfile}
      displayName={displayName}
    />
  );
}