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
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  UsersIcon,
  FileTextIcon,
  PlusIcon,
} from "lucide-react";

const LOCATIONS = ["Wellington", "Glenn Innes", "Onehunga"] as const;

export default async function NewShiftPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: "ADMIN" | "VOLUNTEER" } | undefined)
    ?.role;
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
      await prisma.shift.create({
        data: {
          shiftTypeId,
          start,
          end,
          location,
          capacity,
          notes: notes ?? null,
        },
      });
    } catch {
      redirect("/admin/shifts/new?error=create");
    }

    redirect("/admin/shifts?created=1");
  }

  const shiftTypes = await prisma.shiftType.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-4xl mx-auto p-6">
      <PageHeader
        title="Create shift"
        description="Schedule a new volunteer shift with all the essential details."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/shifts">← Back to shifts</Link>
          </Button>
        }
      />

      <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50">
        <CardHeader className="pb-6">
          <CardTitle className="flex items-center gap-2 text-xl font-semibold">
            Shift Details
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Fill in the information below to create a new volunteer shift.
          </p>
        </CardHeader>
        <CardContent className="space-y-8">
          <form action={createShift} className="space-y-8">
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
                  options={shiftTypes.map((t: (typeof shiftTypes)[number]) => ({
                    value: t.id,
                    label: t.name,
                  }))}
                  className="w-full"
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
                />
                <p className="text-xs text-muted-foreground">
                  These notes will be visible to volunteers when they view the
                  shift details.
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
              >
                <Link href="/admin/shifts">Cancel</Link>
              </Button>
              <Button
                type="submit"
                size="lg"
                className="order-1 sm:order-2 bg-primary hover:bg-primary/90"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Create shift
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
