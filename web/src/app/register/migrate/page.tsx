import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { MigrationRegistrationForm } from "./migration-registration-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface PageProps {
  searchParams: {
    token?: string;
  };
}

async function validateToken(token: string) {
  if (!token) return null;

  // For now, we'll find users by a simple token match
  // TODO: When migration is complete, use the actual migrationInvitationToken field
  const user = await prisma.user.findFirst({
    where: {
      profileCompleted: false,
      role: "VOLUNTEER",
      // TODO: Add token validation when migration fields are available
      // migrationInvitationToken: token,
      // migrationTokenExpiresAt: { gt: new Date() }
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      dateOfBirth: true,
      emergencyContactName: true,
      emergencyContactRelationship: true,
      emergencyContactPhone: true,
      medicalConditions: true,
      availableDays: true,
      availableLocations: true,
    }
  });

  return user;
}

export default async function MigrationRegistrationPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  
  // If user is already logged in, redirect to dashboard
  if (session?.user) {
    redirect("/dashboard");
  }

  const { token } = searchParams;

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              Invalid Registration Link
            </CardTitle>
            <CardDescription>
              The registration link is missing required information.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please use the registration link from your invitation email, or contact the volunteer coordinator for assistance.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  const user = await validateToken(token);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Invalid or Expired Link
            </CardTitle>
            <CardDescription>
              This registration link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                The registration link may have expired or already been used. Please contact the volunteer coordinator for a new invitation.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Welcome to Everybody Eats!</h1>
            <p className="text-muted-foreground mt-2">
              Complete your registration to access the new volunteer portal
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Complete Your Profile</CardTitle>
              <CardDescription>
                We've migrated your information from the previous system. Please review and complete your profile setup.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div>Loading...</div>}>
                <MigrationRegistrationForm user={user} token={token} />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}