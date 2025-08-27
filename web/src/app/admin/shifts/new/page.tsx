import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SelectField } from "@/components/ui/select-field";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  UsersIcon,
  FileTextIcon,
  PlusIcon,
  CopyIcon,
  CalendarDaysIcon,
  RefreshCwIcon,
} from "lucide-react";
import { PageContainer } from "@/components/page-container";

const LOCATIONS = ["Wellington", "Glenn Innes", "Onehunga"] as const;

// Common shift patterns for restaurants
const SHIFT_TEMPLATES = {
  "Morning Kitchen": {
    startTime: "08:00",
    endTime: "12:00",
    capacity: 4,
    notes: "Food prep and morning setup",
  },
  "Lunch Service": {
    startTime: "11:00",
    endTime: "15:00",
    capacity: 6,
    notes: "Lunch service and customer support",
  },
  "Afternoon Prep": {
    startTime: "14:00",
    endTime: "18:00",
    capacity: 3,
    notes: "Dinner prep and inventory",
  },
  "Dinner Service": {
    startTime: "17:00",
    endTime: "21:00",
    capacity: 8,
    notes: "Evening service and cleanup",
  },
  "Cleanup & Close": {
    startTime: "20:00",
    endTime: "23:00",
    capacity: 4,
    notes: "Kitchen cleanup and closing duties",
  },
} as const;

type ShiftType = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type RecentShift = {
  id: string;
  start: Date;
  end: Date;
  location: string | null;
  capacity: number;
  notes: string | null;
  shiftType: {
    id: string;
    name: string;
  };
};

export default async function NewShiftPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!session?.user) redirect("/login?callbackUrl=/admin/shifts/new");
  if (role !== "ADMIN") redirect("/shifts");

  async function createShift(formData: FormData) {
    "use server";

    const schema = z.object({
      shiftTypeId: z.string().cuid(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      startTime: z.string().regex(/^\d{2}:\d{2}$/),
      endTime: z.string().regex(/^\d{2}:\d{2}$/),
      location: z.string().min(1),
      capacity: z.coerce.number().int().min(1).max(1000),
      notes: z
        .string()
        .trim()
        .optional()
        .transform((v) => (v && v.length > 0 ? v : null)),
    });

    const parsed = schema.safeParse({
      shiftTypeId: formData.get("shiftTypeId"),
      date: formData.get("date"),
      startTime: formData.get("startTime"),
      endTime: formData.get("endTime"),
      location: formData.get("location"),
      capacity: formData.get("capacity"),
      notes: formData.get("notes"),
    });

    if (!parsed.success) {
      redirect("/admin/shifts/new?error=validation");
    }

    const { shiftTypeId, date, startTime, endTime, location, capacity, notes } =
      parsed.data;

    const start = new Date(`${date}T${startTime}:00`);
    const end = new Date(`${date}T${endTime}:00`);

    if (!(start instanceof Date) || isNaN(start.getTime()))
      redirect("/admin/shifts/new?error=startdate");
    if (!(end instanceof Date) || isNaN(end.getTime()))
      redirect("/admin/shifts/new?error=enddate");
    if (end <= start) redirect("/admin/shifts/new?error=range");

    const now = new Date();
    if (start <= now) redirect("/admin/shifts/new?error=past");

    try {
      // Create the shift
      const shift = await prisma.shift.create({
        data: {
          shiftTypeId,
          start,
          end,
          location,
          capacity,
          notes: notes ?? null,
        },
      });

      // Find matching regular volunteers
      const dayOfWeek = start.toLocaleDateString("en-US", { weekday: "long" });
      const regularVolunteers = await prisma.regularVolunteer.findMany({
        where: {
          shiftTypeId,
          ...(location && { location }),
          isActive: true,
          isPausedByUser: false,
          availableDays: {
            has: dayOfWeek,
          },
        },
      });

      // Filter by frequency
      const matchingRegulars = regularVolunteers.filter((regular) => {
        if (regular.frequency === "WEEKLY") {
          return true;
        } else if (regular.frequency === "FORTNIGHTLY") {
          const weeksSinceCreation = Math.floor(
            (start.getTime() - regular.createdAt.getTime()) /
              (7 * 24 * 60 * 60 * 1000)
          );
          return weeksSinceCreation % 2 === 0;
        } else if (regular.frequency === "MONTHLY") {
          // Check if this is the first occurrence of this day in the month
          const firstOccurrenceInMonth = new Date(
            start.getFullYear(),
            start.getMonth(),
            1
          );
          while (firstOccurrenceInMonth.getDay() !== start.getDay()) {
            firstOccurrenceInMonth.setDate(
              firstOccurrenceInMonth.getDate() + 1
            );
          }
          return start.getDate() === firstOccurrenceInMonth.getDate();
        }
        return false;
      });

      // Create auto-signups for matching regular volunteers
      if (matchingRegulars.length > 0) {
        const signups = [];
        const regularSignups = [];

        for (const regular of matchingRegulars) {
          // Check if user already has a shift on this day
          const shiftDay = new Date(start);
          shiftDay.setHours(0, 0, 0, 0);
          const nextDay = new Date(shiftDay);
          nextDay.setDate(nextDay.getDate() + 1);

          const existingSignup = await prisma.signup.findFirst({
            where: {
              userId: regular.userId,
              shift: {
                start: {
                  gte: shiftDay,
                  lt: nextDay,
                },
              },
              status: {
                in: ["CONFIRMED", "REGULAR_PENDING", "PENDING"],
              },
            },
          });

          if (!existingSignup) {
            const signupId = crypto.randomUUID();
            signups.push({
              id: signupId,
              userId: regular.userId,
              shiftId: shift.id,
              status: "REGULAR_PENDING" as const,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            regularSignups.push({
              regularVolunteerId: regular.id,
              signupId: signupId,
            });
          }
        }

        if (signups.length > 0) {
          await prisma.signup.createMany({ data: signups });
          await prisma.regularSignup.createMany({ data: regularSignups });
        }
      }
    } catch {
      redirect("/admin/shifts/new?error=create");
    }

    redirect("/admin/shifts?created=1");
  }

  async function createBulkShifts(formData: FormData) {
    "use server";

    const schema = z.object({
      shiftTypeId: z.string().cuid(),
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      location: z.string().min(1),
      selectedDays: z.array(z.string()).min(1, "Select at least one day"),
      selectedTemplates: z
        .array(z.string())
        .min(1, "Select at least one template"),
      customCapacity: z.coerce.number().int().min(1).max(1000).optional(),
      notes: z.string().trim().optional(),
    });

    // Parse selected days and templates from FormData
    const formSelectedDays: string[] = [];
    const formSelectedTemplates: string[] = [];

    for (const [key, value] of formData.entries()) {
      if (key.startsWith("day_") && value === "on") {
        formSelectedDays.push(key.replace("day_", ""));
      }
      if (key.startsWith("template_") && value === "on") {
        formSelectedTemplates.push(key.replace("template_", ""));
      }
    }

    const parsed = schema.safeParse({
      shiftTypeId: formData.get("shiftTypeId"),
      startDate: formData.get("startDate"),
      endDate: formData.get("endDate"),
      location: formData.get("location"),
      selectedDays: formSelectedDays,
      selectedTemplates: formSelectedTemplates,
      customCapacity: formData.get("customCapacity") || undefined,
      notes: formData.get("notes") || undefined,
    });

    if (!parsed.success) {
      console.error("Validation errors:", parsed.error.format());
      redirect("/admin/shifts/new?error=bulk_validation");
    }

    const {
      shiftTypeId,
      startDate,
      endDate,
      location,
      selectedDays,
      selectedTemplates,
      customCapacity,
      notes,
    } = parsed.data;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      redirect("/admin/shifts/new?error=date_range");
    }

    const shifts = [];
    const current = new Date(start);

    while (current <= end) {
      const dayName = current.toLocaleDateString("en-US", { weekday: "long" });

      if (selectedDays.includes(dayName)) {
        for (const templateName of selectedTemplates) {
          const template =
            SHIFT_TEMPLATES[templateName as keyof typeof SHIFT_TEMPLATES];
          if (template) {
            const shiftStart = new Date(
              `${current.toISOString().split("T")[0]}T${template.startTime}:00`
            );
            const shiftEnd = new Date(
              `${current.toISOString().split("T")[0]}T${template.endTime}:00`
            );

            // Only create future shifts
            if (shiftStart > new Date()) {
              shifts.push({
                shiftTypeId,
                start: shiftStart,
                end: shiftEnd,
                location,
                capacity: customCapacity || template.capacity,
                notes: notes || template.notes,
              });
            }
          }
        }
      }

      current.setDate(current.getDate() + 1);
    }

    if (shifts.length === 0) {
      redirect("/admin/shifts/new?error=no_shifts");
    }

    try {
      // Create all shifts
      await prisma.shift.createMany({
        data: shifts,
      });

      // Get the created shifts
      const createdShifts = await prisma.shift.findMany({
        where: {
          shiftTypeId,
          location,
          start: {
            gte: shifts[0].start,
            lte: shifts[shifts.length - 1].start,
          },
        },
      });

      // Process regular volunteers for each shift
      for (const shift of createdShifts) {
        const dayOfWeek = shift.start.toLocaleDateString("en-US", {
          weekday: "long",
        });
        const regularVolunteers = await prisma.regularVolunteer.findMany({
          where: {
            shiftTypeId: shift.shiftTypeId,
            ...(shift.location && { location: shift.location }),
            isActive: true,
            isPausedByUser: false,
            availableDays: {
              has: dayOfWeek,
            },
          },
        });

        // Filter by frequency
        const matchingRegulars = regularVolunteers.filter((regular) => {
          if (regular.frequency === "WEEKLY") {
            return true;
          } else if (regular.frequency === "FORTNIGHTLY") {
            const weeksSinceCreation = Math.floor(
              (shift.start.getTime() - regular.createdAt.getTime()) /
                (7 * 24 * 60 * 60 * 1000)
            );
            return weeksSinceCreation % 2 === 0;
          } else if (regular.frequency === "MONTHLY") {
            const firstOccurrenceInMonth = new Date(
              shift.start.getFullYear(),
              shift.start.getMonth(),
              1
            );
            while (firstOccurrenceInMonth.getDay() !== shift.start.getDay()) {
              firstOccurrenceInMonth.setDate(
                firstOccurrenceInMonth.getDate() + 1
              );
            }
            return shift.start.getDate() === firstOccurrenceInMonth.getDate();
          }
          return false;
        });

        // Create auto-signups
        const signups = [];
        const regularSignups = [];

        for (const regular of matchingRegulars) {
          const shiftDay = new Date(shift.start);
          shiftDay.setHours(0, 0, 0, 0);
          const nextDay = new Date(shiftDay);
          nextDay.setDate(nextDay.getDate() + 1);

          const existingSignup = await prisma.signup.findFirst({
            where: {
              userId: regular.userId,
              shift: {
                start: {
                  gte: shiftDay,
                  lt: nextDay,
                },
              },
              status: {
                in: ["CONFIRMED", "REGULAR_PENDING", "PENDING"],
              },
            },
          });

          if (!existingSignup) {
            const signupId = crypto.randomUUID();
            signups.push({
              id: signupId,
              userId: regular.userId,
              shiftId: shift.id,
              status: "REGULAR_PENDING" as const,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            regularSignups.push({
              regularVolunteerId: regular.id,
              signupId: signupId,
            });
          }
        }

        if (signups.length > 0) {
          await prisma.signup.createMany({ data: signups });
          await prisma.regularSignup.createMany({ data: regularSignups });
        }
      }
    } catch (error) {
      console.error("Bulk creation error:", error);
      redirect("/admin/shifts/new?error=bulk_create");
    }

    redirect(`/admin/shifts?created=${shifts.length}`);
  }

  const shiftTypes = await prisma.shiftType.findMany({
    orderBy: { name: "asc" },
  });

  // Get last week's shifts for potential copying
  const lastWeekStart = new Date();
  lastWeekStart.setDate(lastWeekStart.getDate() - 14);
  const lastWeekEnd = new Date();
  lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);

  const recentShifts = await prisma.shift.findMany({
    where: {
      start: {
        gte: lastWeekStart,
        lte: lastWeekEnd,
      },
    },
    include: {
      shiftType: true,
    },
    orderBy: { start: "desc" },
    take: 10,
  });

  return (
    <PageContainer testid="create-shift-page">
      <PageHeader
        title="Create shifts"
        description="Schedule new volunteer shifts efficiently with single or bulk creation options."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/shifts">← Back to shifts</Link>
          </Button>
        }
      />

      <Tabs defaultValue="single" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="single" className="flex items-center gap-2">
            <PlusIcon className="h-4 w-4" />
            Single Shift
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center gap-2">
            <CalendarDaysIcon className="h-4 w-4" />
            Weekly Schedule
          </TabsTrigger>
          <TabsTrigger value="copy" className="flex items-center gap-2">
            <CopyIcon className="h-4 w-4" />
            Copy Previous
          </TabsTrigger>
        </TabsList>

        {/* Single Shift Creation */}
        <TabsContent value="single">
          <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                <PlusIcon className="h-5 w-5" />
                Create Single Shift
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Create a single volunteer shift with specific details.
              </p>
            </CardHeader>
            <CardContent className="space-y-8">
              <form action={createShift} className="space-y-8">
                {/* Quick Templates */}
                <div
                  className="space-y-3"
                  data-testid="quick-templates-section"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">
                      Quick Templates
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(SHIFT_TEMPLATES).map(([name, template]) => (
                      <Badge
                        key={name}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary/10 transition-colors"
                      >
                        {name} ({template.startTime}-{template.endTime})
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Template times and capacities for quick reference
                  </p>
                </div>

                {/* Shift Type Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">
                      Shift Type
                    </h3>
                  </div>
                  <div>
                    <Label
                      htmlFor="shiftTypeId"
                      className="text-sm font-medium mb-2 block"
                    >
                      Select shift type *
                    </Label>
                    <SelectField
                      name="shiftTypeId"
                      id="shiftTypeId"
                      placeholder="Choose the type of volunteer work..."
                      required
                      options={shiftTypes.map((t: ShiftType) => ({
                        value: t.id,
                        label: t.name,
                      }))}
                      className="w-full"
                      data-testid="shift-type-select"
                    />
                  </div>
                </div>

                {/* Date & Time Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">
                      Schedule
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="date"
                        className="text-sm font-medium flex items-center gap-2"
                      >
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        Date *
                      </Label>
                      <Input
                        type="date"
                        name="date"
                        id="date"
                        required
                        className="h-11"
                        data-testid="shift-date-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="startTime"
                        className="text-sm font-medium flex items-center gap-2"
                      >
                        <ClockIcon className="h-4 w-4 text-muted-foreground" />
                        Start time *
                      </Label>
                      <Input
                        type="time"
                        name="startTime"
                        id="startTime"
                        required
                        className="h-11"
                        data-testid="shift-start-time-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="endTime"
                        className="text-sm font-medium flex items-center gap-2"
                      >
                        <ClockIcon className="h-4 w-4 text-muted-foreground" />
                        End time *
                      </Label>
                      <Input
                        type="time"
                        name="endTime"
                        id="endTime"
                        required
                        className="h-11"
                        data-testid="shift-end-time-input"
                      />
                    </div>
                  </div>
                </div>

                {/* Location & Capacity Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">
                      Location & Capacity
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="location"
                        className="text-sm font-medium flex items-center gap-2"
                      >
                        <MapPinIcon className="h-4 w-4 text-muted-foreground" />
                        Location *
                      </Label>
                      <SelectField
                        name="location"
                        id="location"
                        placeholder="Choose a location..."
                        required
                        options={LOCATIONS.map((loc) => ({
                          value: loc,
                          label: loc,
                        }))}
                        className="w-full"
                        data-testid="shift-location-select"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="capacity"
                        className="text-sm font-medium flex items-center gap-2"
                      >
                        <UsersIcon className="h-4 w-4 text-muted-foreground" />
                        Volunteer capacity *
                      </Label>
                      <Input
                        type="number"
                        name="capacity"
                        id="capacity"
                        min={1}
                        step={1}
                        placeholder="e.g. 6"
                        required
                        className="h-11"
                        data-testid="shift-capacity-input"
                      />
                      <p className="text-xs text-muted-foreground">
                        Maximum number of volunteers needed
                      </p>
                    </div>
                  </div>
                </div>

                {/* Notes Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">
                      Additional Information
                    </h3>
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="notes"
                      className="text-sm font-medium flex items-center gap-2"
                    >
                      <FileTextIcon className="h-4 w-4 text-muted-foreground" />
                      Notes (optional)
                    </Label>
                    <Textarea
                      name="notes"
                      id="notes"
                      rows={4}
                      placeholder="Add any special instructions, requirements, or additional details for volunteers..."
                      className="resize-none"
                      data-testid="shift-notes-textarea"
                    />
                    <p className="text-xs text-muted-foreground">
                      These notes will be visible to volunteers when they view
                      the shift details.
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t">
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="order-2 sm:order-1"
                    data-testid="cancel-shift-creation-button"
                  >
                    <Link href="/admin/shifts">Cancel</Link>
                  </Button>
                  <Button
                    type="submit"
                    size="lg"
                    className="order-1 sm:order-2 bg-primary hover:bg-primary/90"
                    data-testid="create-shift-button"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Create shift
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bulk Creation */}
        <TabsContent value="bulk">
          <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                <CalendarDaysIcon className="h-5 w-5" />
                Create Weekly Schedule
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Create multiple shifts across several days using templates for
                efficient weekly planning.
              </p>
            </CardHeader>
            <CardContent className="space-y-8">
              <form action={createBulkShifts} className="space-y-8">
                {/* Shift Type */}
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">
                    Shift Type
                  </h3>
                  <SelectField
                    name="shiftTypeId"
                    placeholder="Choose the type of volunteer work..."
                    required
                    options={shiftTypes.map((t: ShiftType) => ({
                      value: t.id,
                      label: t.name,
                    }))}
                    className="w-full"
                    data-testid="bulk-shift-type-select"
                  />
                </div>

                {/* Date Range */}
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">
                    Date Range
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Start Date *</Label>
                      <Input
                        type="date"
                        name="startDate"
                        id="startDate"
                        required
                        className="h-11"
                        data-testid="bulk-start-date-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endDate">End Date *</Label>
                      <Input
                        type="date"
                        name="endDate"
                        id="endDate"
                        required
                        className="h-11"
                        data-testid="bulk-end-date-input"
                      />
                    </div>
                  </div>
                </div>

                {/* Days Selection */}
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">
                    Days of Week
                  </h3>
                  <div className="grid grid-cols-3 lg:grid-cols-7 gap-3">
                    {[
                      "Monday",
                      "Tuesday",
                      "Wednesday",
                      "Thursday",
                      "Friday",
                      "Saturday",
                      "Sunday",
                    ].map((day) => (
                      <div key={day} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          name={`day_${day}`}
                          id={`day_${day}`}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          data-testid={`day-${day.toLowerCase()}-checkbox`}
                        />
                        <Label htmlFor={`day_${day}`} className="text-sm">
                          {day.slice(0, 3)}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Template Selection */}
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">
                    Shift Templates
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {Object.entries(SHIFT_TEMPLATES).map(([name, template]) => (
                      <div
                        key={name}
                        className="flex items-start space-x-3 p-4 border rounded-lg"
                      >
                        <input
                          type="checkbox"
                          name={`template_${name}`}
                          id={`template_${name}`}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary mt-1"
                          data-testid={`template-${name
                            .toLowerCase()
                            .replace(/\s+/g, "-")}-checkbox`}
                        />
                        <div className="flex-1">
                          <Label
                            htmlFor={`template_${name}`}
                            className="font-medium"
                          >
                            {name}
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            {template.startTime} - {template.endTime} •{" "}
                            {template.capacity} volunteers
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {template.notes}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Location and Overrides */}
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">
                    Location & Overrides
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="location">Location *</Label>
                      <SelectField
                        name="location"
                        placeholder="Choose a location..."
                        required
                        options={LOCATIONS.map((loc) => ({
                          value: loc,
                          label: loc,
                        }))}
                        className="w-full"
                        data-testid="bulk-location-select"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customCapacity">
                        Override Capacity (optional)
                      </Label>
                      <Input
                        type="number"
                        name="customCapacity"
                        id="customCapacity"
                        min={1}
                        step={1}
                        placeholder="Leave empty to use template defaults"
                        className="h-11"
                      />
                    </div>
                  </div>
                </div>

                {/* Common Notes */}
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">
                    Common Notes (optional)
                  </h3>
                  <Textarea
                    name="notes"
                    rows={3}
                    placeholder="Add notes that will apply to all created shifts..."
                    className="resize-none"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t">
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="order-2 sm:order-1"
                  >
                    <Link href="/admin/shifts">Cancel</Link>
                  </Button>
                  <Button
                    type="submit"
                    size="lg"
                    className="order-1 sm:order-2 bg-primary hover:bg-primary/90"
                  >
                    <CalendarDaysIcon className="h-4 w-4 mr-2" />
                    Create Schedule
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Copy Previous Shifts */}
        <TabsContent value="copy">
          <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                <CopyIcon className="h-5 w-5" />
                Copy from Previous Week
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Duplicate shifts from previous weeks to maintain consistent
                scheduling.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {recentShifts.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">
                    Recent Shifts (Last 2 Weeks)
                  </h3>
                  <div className="space-y-3">
                    {recentShifts.map((shift: RecentShift) => (
                      <div
                        key={shift.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="space-y-1">
                          <div className="font-medium">
                            {shift.shiftType.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {shift.start.toLocaleDateString()} •{" "}
                            {shift.start.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            -{" "}
                            {shift.end.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {shift.location} • {shift.capacity} volunteers
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          <RefreshCwIcon className="h-4 w-4 mr-2" />
                          Copy for Next Week
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-muted-foreground mb-4">
                    No recent shifts found to copy from.
                  </div>
                  <Button asChild variant="outline">
                    <Link href="/admin/shifts/new">
                      Create Weekly Schedule Instead
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
