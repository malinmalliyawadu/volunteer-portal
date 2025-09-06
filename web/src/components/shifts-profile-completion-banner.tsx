import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle, User } from "lucide-react";

export async function ShiftsProfileCompletionBanner() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return null;
  }

  try {
    // Fetch user profile data
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        phone: true,
        dateOfBirth: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        volunteerAgreementAccepted: true,
        healthSafetyPolicyAccepted: true,
      },
    });

    if (!user) {
      return null;
    }

    // Check if essential profile information is missing
    const missingFields = [];
    
    if (!user.phone) missingFields.push("Mobile number");
    if (!user.dateOfBirth) missingFields.push("Date of birth");
    if (!user.emergencyContactName) missingFields.push("Emergency contact name");
    if (!user.emergencyContactPhone) missingFields.push("Emergency contact phone");
    if (!user.volunteerAgreementAccepted) missingFields.push("Volunteer agreement");
    if (!user.healthSafetyPolicyAccepted) missingFields.push("Health & safety policy");

    // If profile is complete, don't show banner
    if (missingFields.length === 0) {
      return null;
    }

    return (
      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg p-4 mb-6" data-testid="profile-completion-banner">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Complete your profile to sign up for shifts
            </h3>
            <div className="mt-1 text-sm text-amber-700 dark:text-amber-300">
              <p className="mb-2">
                You need to complete your volunteer profile before you can sign up for shifts. This ensures we have all the essential information needed for volunteering.
              </p>
              <p className="text-xs">
                Missing: {missingFields.join(", ")}
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="flex-shrink-0">
            <Link href="/profile/edit" className="flex items-center gap-1">
              <User className="h-4 w-4" />
              Complete Profile
            </Link>
          </Button>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error checking profile completion:", error);
    return null;
  }
}