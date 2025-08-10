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
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  User,
  Heart,
  Shield,
  Filter,
  ChevronLeft,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";

interface AdminVolunteerPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const LOCATIONS = ["Wellington", "Glenn Innes", "Onehunga"] as const;
type LocationOption = (typeof LOCATIONS)[number];

export default async function AdminVolunteerPage({
  params,
  searchParams,
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
  const searchParamsResolved = await searchParams;

  // Get location filter from search params
  const rawLocation = Array.isArray(searchParamsResolved.location)
    ? searchParamsResolved.location[0]
    : searchParamsResolved.location;
  const selectedLocation: LocationOption | undefined = LOCATIONS.includes(
    (rawLocation as LocationOption) ?? ("" as LocationOption)
  )
    ? (rawLocation as LocationOption)
    : undefined;

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
      profilePhotoUrl: true,
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
        where: selectedLocation
          ? { shift: { location: selectedLocation } }
          : {},
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

  // Calculate shift statistics (all shifts, not filtered)
  const allSignups = await prisma.signup.findMany({
    where: { userId: id },
    include: {
      shift: {
        include: {
          shiftType: true,
        },
      },
    },
  });

  const now = new Date();
  const totalShifts = allSignups.length;
  const upcomingShifts = allSignups.filter(
    (signup: (typeof allSignups)[0]) =>
      signup.shift.start >= now && signup.status === "CONFIRMED"
  ).length;
  const completedShifts = allSignups.filter(
    (signup: (typeof allSignups)[0]) =>
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
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto p-4">
        <PageHeader
          title="Volunteer Profile"
          description="Comprehensive view of volunteer information and activity"
        >
          <div className="flex justify-start mt-6">
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link href="/admin/shifts">
                <ChevronLeft className="h-4 w-4" />
                Back to Shifts
              </Link>
            </Button>
          </div>
        </PageHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Basic Information */}
            <Card className="shadow-sm border-slate-200 h-fit">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="flex justify-center mx-auto mb-4">
                    <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
                      <AvatarImage
                        src={volunteer.profilePhotoUrl || ""}
                        alt={volunteer.name || "Volunteer"}
                      />
                      <AvatarFallback className="text-xl font-bold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                        {volunteerInitials}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    {volunteer.name || "Volunteer"}
                  </h2>

                  <div className="flex items-center justify-center gap-2 text-slate-600 mb-4">
                    <Mail className="h-4 w-4" />
                    <span className="text-sm">{volunteer.email}</span>
                  </div>

                  {volunteer.pronouns && (
                    <p className="text-sm text-slate-500 mb-4">
                      Pronouns: {volunteer.pronouns}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 justify-center mb-6">
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                      <User className="h-3 w-3 mr-1" />
                      {volunteer.role === "ADMIN"
                        ? "Administrator"
                        : "Volunteer"}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="border-green-200 text-green-700"
                    >
                      <Heart className="h-3 w-3 mr-1" />
                      Active Member
                    </Badge>
                    {volunteer.volunteerAgreementAccepted && (
                      <Badge
                        variant="outline"
                        className="border-emerald-200 text-emerald-700"
                      >
                        <Shield className="h-3 w-3 mr-1" />
                        Agreement Signed
                      </Badge>
                    )}
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-slate-900">
                        {totalShifts}
                      </div>
                      <div className="text-xs text-slate-500">Total Shifts</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {upcomingShifts}
                      </div>
                      <div className="text-xs text-slate-500">Upcoming</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {completedShifts}
                      </div>
                      <div className="text-xs text-slate-500">Completed</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card className="shadow-sm border-slate-200 h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <Phone className="h-5 w-5 text-blue-600" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <Phone className="h-4 w-4 text-slate-500" />
                    <div>
                      <label className="text-sm font-medium text-slate-700">
                        Phone
                      </label>
                      <p className="text-sm text-slate-600">
                        {volunteer.phone || "Not provided"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <Calendar className="h-4 w-4 text-slate-500" />
                    <div>
                      <label className="text-sm font-medium text-slate-700">
                        Date of Birth
                      </label>
                      <p className="text-sm text-slate-600">
                        {volunteer.dateOfBirth
                          ? format(volunteer.dateOfBirth, "dd MMM yyyy")
                          : "Not provided"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            <Card className="shadow-sm border-slate-200 h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <Heart className="h-5 w-5 text-red-500" />
                  Emergency Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Name
                  </label>
                  <p className="text-sm text-slate-600">
                    {volunteer.emergencyContactName || "Not provided"}
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Relationship
                  </label>
                  <p className="text-sm text-slate-600">
                    {volunteer.emergencyContactRelationship || "Not provided"}
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Phone
                  </label>
                  <p className="text-sm text-slate-600">
                    {volunteer.emergencyContactPhone || "Not provided"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Detailed Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Availability & Preferences */}
            <Card className="shadow-sm border-slate-200 h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <MapPin className="h-5 w-5 text-green-600" />
                  Availability & Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-3 block">
                    Available Days
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableDays.length > 0 ? (
                      availableDays.map((day: string) => (
                        <Badge
                          key={day}
                          variant="outline"
                          className="border-blue-200 text-blue-700"
                        >
                          {dayLabels[day] || day}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500 italic">
                        Not specified
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-3 block">
                    Available Locations
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableLocations.length > 0 ? (
                      availableLocations.map((location: string) => (
                        <Badge
                          key={location}
                          variant="outline"
                          className="border-green-200 text-green-700"
                        >
                          <MapPin className="h-3 w-3 mr-1" />
                          {locationLabels[location] || location}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500 italic">
                        Not specified
                      </span>
                    )}
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-100">
                  <label className="text-sm font-medium text-slate-700">
                    How did they hear about us?
                  </label>
                  <p className="text-sm text-slate-600 mt-1">
                    {volunteer.howDidYouHearAboutUs
                      ? hearAboutLabels[volunteer.howDidYouHearAboutUs] ||
                        volunteer.howDidYouHearAboutUs
                      : "Not specified"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Additional Information */}
            <Card className="shadow-sm border-slate-200 h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <Shield className="h-5 w-5 text-purple-600" />
                  Additional Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <label className="text-sm font-medium text-slate-700">
                      Medical Conditions
                    </label>
                    <p className="text-sm text-slate-600 mt-1">
                      {volunteer.medicalConditions || "None specified"}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <label className="text-sm font-medium text-slate-700">
                      Willing to provide reference
                    </label>
                    <p className="text-sm text-slate-600 mt-1">
                      {volunteer.willingToProvideReference ? "Yes" : "No"}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <label className="text-sm font-medium text-slate-700">
                      Member since
                    </label>
                    <p className="text-sm text-slate-600 mt-1">
                      {format(volunteer.createdAt, "dd MMM yyyy")}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <label className="text-sm font-medium text-slate-700">
                      Newsletter
                    </label>
                    <p className="text-sm text-slate-600 mt-1">
                      {volunteer.emailNewsletterSubscription
                        ? "Subscribed"
                        : "Not subscribed"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Shift History with Location Filter */}
            <Card className="shadow-sm border-slate-200 h-fit">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <Clock className="h-5 w-5 text-indigo-600" />
                    Shift History
                    {selectedLocation && (
                      <Badge
                        variant="outline"
                        className="ml-2 border-indigo-200 text-indigo-700"
                      >
                        <Filter className="h-3 w-3 mr-1" />
                        {selectedLocation}
                      </Badge>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {/* Location Filter Buttons */}
                    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                      <Link
                        href={`/admin/volunteers/${id}`}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                          !selectedLocation
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        All
                      </Link>
                      {LOCATIONS.map((location) => (
                        <Link
                          key={location}
                          href={`/admin/volunteers/${id}?location=${location}`}
                          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                            selectedLocation === location
                              ? "bg-white text-slate-900 shadow-sm"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          {location}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {volunteer.signups.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">
                      {selectedLocation
                        ? `No shift signups found for ${selectedLocation}`
                        : "No shift signups yet"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {volunteer.signups
                      .slice(0, 10)
                      .map((signup: (typeof volunteer.signups)[0]) => (
                        <div
                          key={signup.id}
                          className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-slate-900">
                                {signup.shift.shiftType.name}
                              </h4>
                              {signup.shift.location && (
                                <Badge
                                  variant="outline"
                                  className="border-slate-300 text-slate-600"
                                >
                                  <MapPin className="h-3 w-3 mr-1" />
                                  {signup.shift.location}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-600">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(signup.shift.start, "EEE dd MMM yyyy")}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(signup.shift.start, "h:mma")} –{" "}
                                {format(signup.shift.end, "h:mma")}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              className={
                                signup.status === "CONFIRMED"
                                  ? "bg-green-100 text-green-800 border-green-200"
                                  : signup.status === "WAITLISTED"
                                  ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                                  : "bg-gray-100 text-gray-800 border-gray-200"
                              }
                            >
                              {signup.status === "CONFIRMED" && "Confirmed"}
                              {signup.status === "WAITLISTED" && "Waitlisted"}
                              {signup.status === "CANCELED" && "Canceled"}
                            </Badge>
                            {signup.shift.start < now && (
                              <Badge
                                variant="outline"
                                className="border-slate-300 text-slate-500"
                              >
                                Past
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    {volunteer.signups.length > 10 && (
                      <div className="text-center py-4 border-t border-slate-100">
                        <p className="text-sm text-slate-500">
                          Showing 10 most recent of {volunteer.signups.length}{" "}
                          total shifts
                          {selectedLocation && ` in ${selectedLocation}`}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
