import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SelectField } from "@/components/ui/select-field";

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
    <div className="max-w-2xl mx-auto p-4">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Create shift</h1>
          <p className="muted-text mt-1">Add a new upcoming shift.</p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/admin/shifts">Back to shifts</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <form action={createShift} className="space-y-4">
            <div>
              <Label htmlFor="shiftTypeId" className="block text-sm mb-1">
                Shift type
              </Label>
              <SelectField
                name="shiftTypeId"
                id="shiftTypeId"
                placeholder="Select a shift type..."
                required
                options={shiftTypes.map((t: (typeof shiftTypes)[number]) => ({
                  value: t.id,
                  label: t.name,
                }))}
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="date" className="block text-sm mb-1">
                  Date
                </Label>
                <Input type="date" name="date" id="date" required />
              </div>
              <div>
                <Label htmlFor="startTime" className="block text-sm mb-1">
                  Start time
                </Label>
                <Input type="time" name="startTime" id="startTime" required />
              </div>
              <div>
                <Label htmlFor="endTime" className="block text-sm mb-1">
                  End time
                </Label>
                <Input type="time" name="endTime" id="endTime" required />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="location" className="block text-sm mb-1">
                  Location
                </Label>
                <SelectField
                  name="location"
                  id="location"
                  placeholder="Select a location..."
                  required
                  options={LOCATIONS.map((loc) => ({ value: loc, label: loc }))}
                  className="w-full"
                />
              </div>
              <div>
                <Label htmlFor="capacity" className="block text-sm mb-1">
                  Capacity
                </Label>
                <Input
                  type="number"
                  name="capacity"
                  id="capacity"
                  min={1}
                  step={1}
                  placeholder="e.g. 6"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes" className="block text-sm mb-1">
                Notes (optional)
              </Label>
              <Textarea name="notes" id="notes" rows={3} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button asChild variant="secondary">
                <Link href="/admin/shifts">Cancel</Link>
              </Button>
              <Button type="submit">Create shift</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
