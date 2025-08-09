import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  // Fetch complete user profile data
  let userProfile = null;
  if (session?.user?.email) {
    userProfile = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        phone: true,
        dateOfBirth: true,
        pronouns: true,
        emergencyContactName: true,
        emergencyContactRelationship: true,
        emergencyContactPhone: true,
        medicalConditions: true,
        willingToProvideReference: true,
        howDidYouHearAboutUs: true,
        availableDays: true,
        availableLocations: true,
        emailNewsletterSubscription: true,
        notificationPreference: true,
        volunteerAgreementAccepted: true,
        healthSafetyPolicyAccepted: true,
        role: true,
      },
    });
  }

  const userInitials =
    userProfile?.name || session?.user?.name
      ? (userProfile?.name || session?.user?.name)!
          .split(" ")
          .map((name: string) => name.charAt(0))
          .join("")
          .substring(0, 2)
          .toUpperCase()
      : "U";

  const availableDays = userProfile?.availableDays
    ? JSON.parse(userProfile.availableDays)
    : [];
  const availableLocations = userProfile?.availableLocations
    ? JSON.parse(userProfile.availableLocations)
    : [];

  // Create edit URL with current data
  const editUrl = `/profile/edit?${new URLSearchParams({
    firstName: userProfile?.firstName || "",
    lastName: userProfile?.lastName || "",
    email: userProfile?.email || "",
    phone: userProfile?.phone || "",
    dateOfBirth: userProfile?.dateOfBirth?.toISOString() || "",
    pronouns: userProfile?.pronouns || "",
    emergencyContactName: userProfile?.emergencyContactName || "",
    emergencyContactRelationship:
      userProfile?.emergencyContactRelationship || "",
    emergencyContactPhone: userProfile?.emergencyContactPhone || "",
    medicalConditions: userProfile?.medicalConditions || "",
    willingToProvideReference:
      userProfile?.willingToProvideReference?.toString() || "false",
    howDidYouHearAboutUs: userProfile?.howDidYouHearAboutUs || "",
    availableDays: JSON.stringify(availableDays),
    availableLocations: JSON.stringify(availableLocations),
    emailNewsletterSubscription:
      userProfile?.emailNewsletterSubscription?.toString() || "true",
    notificationPreference: userProfile?.notificationPreference || "EMAIL",
    volunteerAgreementAccepted:
      userProfile?.volunteerAgreementAccepted?.toString() || "false",
    healthSafetyPolicyAccepted:
      userProfile?.healthSafetyPolicyAccepted?.toString() || "false",
  }).toString()}`;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary-700 bg-clip-text text-transparent">
          Your Profile
        </h1>
        <p className="text-muted-foreground">
          Manage your volunteer account and track your impact
        </p>
      </div>

      {session?.user ? (
        <div className="space-y-8">
          {/* Profile Header */}
          <Card className="animate-slide-up">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                <div className="relative">
                  <div className="w-24 h-24 bg-gradient-to-br from-primary to-primary-700 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    {userInitials}
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                    <span className="text-lg">🌟</span>
                  </div>
                </div>

                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-2xl font-bold mb-2">
                    {userProfile?.name || session.user.name || "Volunteer"}
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    {userProfile?.email || session.user.email}
                  </p>
                  {userProfile?.pronouns && (
                    <p className="text-sm text-muted-foreground mb-4">
                      Pronouns: {userProfile.pronouns}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                    <Badge className="badge-primary">
                      {userProfile?.role === "ADMIN"
                        ? "Administrator"
                        : "Volunteer"}
                    </Badge>
                    <Badge variant="outline" className="badge-accent">
                      Active Member
                    </Badge>
                    {userProfile?.volunteerAgreementAccepted && (
                      <Badge
                        variant="outline"
                        className="text-green-600 border-green-200"
                      >
                        Agreement Signed
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={editUrl} className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      Edit Profile
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card
              className="animate-slide-up"
              style={{ animationDelay: "0.1s" }}
            >
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-blue-600 mb-1">0</h3>
                <p className="text-sm text-muted-foreground">
                  Shifts Completed
                </p>
              </CardContent>
            </Card>

            <Card
              className="animate-slide-up"
              style={{ animationDelay: "0.2s" }}
            >
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-green-600 mb-1">0</h3>
                <p className="text-sm text-muted-foreground">
                  Hours Volunteered
                </p>
              </CardContent>
            </Card>

            <Card
              className="animate-slide-up"
              style={{ animationDelay: "0.3s" }}
            >
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-6 h-6 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-purple-600 mb-1">0</h3>
                <p className="text-sm text-muted-foreground">Meals Served</p>
              </CardContent>
            </Card>
          </div>

          {/* Profile Details Grid */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Personal Information */}
            <Card
              className="animate-slide-up"
              style={{ animationDelay: "0.4s" }}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">
                      Personal Information
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Your account details
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-border">
                    <span className="text-sm font-medium text-muted-foreground">
                      Name
                    </span>
                    <span className="font-medium">
                      {userProfile?.name || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-border">
                    <span className="text-sm font-medium text-muted-foreground">
                      Email
                    </span>
                    <span className="font-medium">
                      {userProfile?.email || "—"}
                    </span>
                  </div>
                  {userProfile?.phone && (
                    <div className="flex justify-between items-center py-3 border-b border-border">
                      <span className="text-sm font-medium text-muted-foreground">
                        Phone
                      </span>
                      <span className="font-medium">{userProfile.phone}</span>
                    </div>
                  )}
                  {userProfile?.dateOfBirth && (
                    <div className="flex justify-between items-center py-3 border-b border-border">
                      <span className="text-sm font-medium text-muted-foreground">
                        Date of Birth
                      </span>
                      <span className="font-medium">
                        {new Date(userProfile.dateOfBirth).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-3">
                    <span className="text-sm font-medium text-muted-foreground">
                      Account Type
                    </span>
                    <span className="font-medium">
                      {userProfile?.role === "ADMIN"
                        ? "Administrator"
                        : "Volunteer"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contact & Availability */}
            <Card
              className="animate-slide-up"
              style={{ animationDelay: "0.5s" }}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">Emergency Contact</h2>
                    <p className="text-sm text-muted-foreground">
                      Emergency contact information
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {userProfile?.emergencyContactName ? (
                    <>
                      <div className="flex justify-between items-center py-3 border-b border-border">
                        <span className="text-sm font-medium text-muted-foreground">
                          Name
                        </span>
                        <span className="font-medium">
                          {userProfile.emergencyContactName}
                        </span>
                      </div>
                      {userProfile.emergencyContactRelationship && (
                        <div className="flex justify-between items-center py-3 border-b border-border">
                          <span className="text-sm font-medium text-muted-foreground">
                            Relationship
                          </span>
                          <span className="font-medium">
                            {userProfile.emergencyContactRelationship}
                          </span>
                        </div>
                      )}
                      {userProfile.emergencyContactPhone && (
                        <div className="flex justify-between items-center py-3">
                          <span className="text-sm font-medium text-muted-foreground">
                            Phone
                          </span>
                          <span className="font-medium">
                            {userProfile.emergencyContactPhone}
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      No emergency contact information provided
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Availability Information */}
            <Card
              className="animate-slide-up"
              style={{ animationDelay: "0.6s" }}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">Availability</h2>
                    <p className="text-sm text-muted-foreground">
                      When and where you can volunteer
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {availableDays.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">
                        Available Days:
                      </span>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {availableDays.map((day: string) => (
                          <Badge
                            key={day}
                            variant="outline"
                            className="text-xs"
                          >
                            {day.charAt(0).toUpperCase() + day.slice(1)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {availableLocations.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">
                        Available Locations:
                      </span>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {availableLocations.map((location: string) => (
                          <Badge
                            key={location}
                            variant="outline"
                            className="text-xs"
                          >
                            {location.charAt(0).toUpperCase() +
                              location.slice(1)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {availableDays.length === 0 &&
                    availableLocations.length === 0 && (
                      <p className="text-muted-foreground text-center py-4">
                        No availability preferences set
                      </p>
                    )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card
              className="animate-slide-up"
              style={{ animationDelay: "0.7s" }}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">Quick Actions</h2>
                    <p className="text-sm text-muted-foreground">
                      Manage your volunteer experience
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button
                    asChild
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <Link href="/shifts" className="flex items-center gap-3">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      Browse Available Shifts
                    </Link>
                  </Button>

                  <Button
                    asChild
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <Link
                      href="/shifts/mine"
                      className="flex items-center gap-3"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5H7a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      View My Schedule
                    </Link>
                  </Button>

                  <div className="pt-4 border-t border-border">
                    <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                      <div className="flex items-start gap-3">
                        <svg
                          className="w-5 h-5 text-primary mt-0.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <div>
                          <p className="font-medium text-primary">
                            Complete your profile!
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Add your emergency contact, availability, and
                            preferences to get the most out of your volunteer
                            experience.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card className="animate-slide-up">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-primary/60"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Sign in required</h3>
            <p className="text-muted-foreground mb-4">
              Please sign in to view and manage your profile.
            </p>
            <Button asChild>
              <Link href="/login">Sign in to your account</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
