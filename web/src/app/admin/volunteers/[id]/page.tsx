import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AdminVolunteerPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminVolunteerPage({
  params,
}: AdminVolunteerPageProps) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: "ADMIN" | "VOLUNTEER" } | undefined)
    ?.role;

  if (!session?.user) {
    redirect("/login?callbackUrl=/admin");
  }
  if (role !== "ADMIN") {
    redirect("/dashboard");
  }

  const { id } = await params;

  // Fetch volunteer profile data
  const volunteer = await prisma.user.findUnique({
    where: { id },
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
      createdAt: true,
      signups: {
        include: {
          shift: {
            include: {
              shiftType: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!volunteer) {
    notFound();
  }

  const volunteerInitials = volunteer.name
    ? volunteer.name
        .split(" ")
        .map((name: string) => name.charAt(0))
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "V";

  const availableDays = volunteer.availableDays
    ? JSON.parse(volunteer.availableDays)
    : [];
  const availableLocations = volunteer.availableLocations
    ? JSON.parse(volunteer.availableLocations)
    : [];

  // Calculate shift statistics
  const now = new Date();
  const totalShifts = volunteer.signups.length;
  const upcomingShifts = volunteer.signups.filter(
    (signup: (typeof volunteer.signups)[0]) =>
      signup.shift.start >= now && signup.status === "CONFIRMED"
  ).length;
  const completedShifts = volunteer.signups.filter(
    (signup: (typeof volunteer.signups)[0]) =>
      signup.shift.start < now && signup.status === "CONFIRMED"
  ).length;

  const dayLabels: Record<string, string> = {
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday",
    sunday: "Sunday",
  };

  const locationLabels: Record<string, string> = {
    wellington: "Wellington",
    "glenn-innes": "Glenn Innes",
    onehunga: "Onehunga",
    mobile: "Mobile/Outreach",
  };

  const hearAboutLabels: Record<string, string> = {
    facebook: "Facebook",
    instagram: "Instagram",
    website: "Website",
    friend: "Friend/Word of mouth",
    community_board: "Community board",
    volunteer_website: "Volunteer website",
    other: "Other",
    not_specified: "Not specified",
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="secondary" size="sm">
            <Link href="/admin/shifts">← Back to Shifts</Link>
          </Button>
          <div>
            <h1 className="text-3xl font-semibold">Volunteer Profile</h1>
            <p className="muted-text mt-1">
              Viewing detailed information for this volunteer.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="flex-shrink-0">
                <Avatar className="h-20 w-20">
                  <AvatarImage src="" alt={volunteer.name || "Volunteer"} />
                  <AvatarFallback className="text-lg font-semibold">
                    {volunteerInitials}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="flex-1 text-center md:text-left">
                <h2 className="text-2xl font-bold mb-2">
                  {volunteer.name || "Volunteer"}
                </h2>
                <p className="text-muted-foreground mb-4">{volunteer.email}</p>
                {volunteer.pronouns && (
                  <p className="text-sm text-muted-foreground mb-4">
                    Pronouns: {volunteer.pronouns}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  <Badge className="badge-primary">
                    {volunteer.role === "ADMIN" ? "Administrator" : "Volunteer"}
                  </Badge>
                  <Badge variant="outline" className="badge-accent">
                    Active Member
                  </Badge>
                  {volunteer.volunteerAgreementAccepted && (
                    <Badge
                      variant="outline"
                      className="text-green-600 border-green-200"
                    >
                      Agreement Signed
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 text-sm">
                <div>
                  <span className="font-medium">Total Shifts:</span>{" "}
                  {totalShifts}
                </div>
                <div>
                  <span className="font-medium">Upcoming:</span>{" "}
                  {upcomingShifts}
                </div>
                <div>
                  <span className="font-medium">Completed:</span>{" "}
                  {completedShifts}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Phone</label>
                <p className="text-sm text-muted-foreground">
                  {volunteer.phone || "Not provided"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Date of Birth</label>
                <p className="text-sm text-muted-foreground">
                  {volunteer.dateOfBirth
                    ? format(volunteer.dateOfBirth, "dd MMM yyyy")
                    : "Not provided"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">
                  Notification Preference
                </label>
                <p className="text-sm text-muted-foreground">
                  {volunteer.notificationPreference}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Newsletter</label>
                <p className="text-sm text-muted-foreground">
                  {volunteer.emailNewsletterSubscription
                    ? "Subscribed"
                    : "Not subscribed"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card>
          <CardHeader>
            <CardTitle>Emergency Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <p className="text-sm text-muted-foreground">
                  {volunteer.emergencyContactName || "Not provided"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Relationship</label>
                <p className="text-sm text-muted-foreground">
                  {volunteer.emergencyContactRelationship || "Not provided"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Phone</label>
                <p className="text-sm text-muted-foreground">
                  {volunteer.emergencyContactPhone || "Not provided"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Availability & Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Availability & Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Available Days</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {availableDays.length > 0 ? (
                  availableDays.map((day: string) => (
                    <Badge key={day} variant="outline">
                      {dayLabels[day] || day}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">
                    Not specified
                  </span>
                )}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Available Locations</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {availableLocations.length > 0 ? (
                  availableLocations.map((location: string) => (
                    <Badge key={location} variant="outline">
                      {locationLabels[location] || location}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">
                    Not specified
                  </span>
                )}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">
                How did they hear about us?
              </label>
              <p className="text-sm text-muted-foreground">
                {volunteer.howDidYouHearAboutUs
                  ? hearAboutLabels[volunteer.howDidYouHearAboutUs] ||
                    volunteer.howDidYouHearAboutUs
                  : "Not specified"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Medical Conditions</label>
              <p className="text-sm text-muted-foreground">
                {volunteer.medicalConditions || "None specified"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">
                Willing to provide reference
              </label>
              <p className="text-sm text-muted-foreground">
                {volunteer.willingToProvideReference ? "Yes" : "No"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Member since</label>
              <p className="text-sm text-muted-foreground">
                {format(volunteer.createdAt, "dd MMM yyyy")}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Recent Shift History */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Shift History</CardTitle>
          </CardHeader>
          <CardContent>
            {volunteer.signups.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No shift signups yet.
              </p>
            ) : (
              <div className="space-y-3">
                {volunteer.signups
                  .slice(0, 10)
                  .map((signup: (typeof volunteer.signups)[0]) => (
                    <div
                      key={signup.id}
                      className="flex items-center justify-between py-2 border-b border-border last:border-0"
                    >
                      <div className="flex-1">
                        <p className="font-medium">
                          {signup.shift.shiftType.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(signup.shift.start, "EEE dd MMM yyyy, h:mma")}{" "}
                          – {format(signup.shift.end, "h:mma")}
                        </p>
                        {signup.shift.location && (
                          <p className="text-sm text-muted-foreground">
                            {signup.shift.location}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            signup.status === "CONFIRMED"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {signup.status === "CONFIRMED" && "Confirmed"}
                          {signup.status === "WAITLISTED" && "Waitlisted"}
                          {signup.status === "CANCELED" && "Canceled"}
                        </Badge>
                        {signup.shift.start < now && (
                          <Badge variant="outline">Past</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                {volunteer.signups.length > 10 && (
                  <p className="text-sm text-muted-foreground text-center mt-4">
                    Showing 10 most recent shifts of {volunteer.signups.length}{" "}
                    total
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
