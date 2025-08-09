import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import Link from "next/link";
import { z } from "zod";

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
        <Link href="/admin/shifts" className="btn btn-secondary">
          Back to shifts
        </Link>
      </div>

      <form action={createShift} className="space-y-4 card p-4">
        <div>
          <label className="block text-sm mb-1">Shift type</label>
          <select
            name="shiftTypeId"
            className="w-full border rounded p-2"
            required
          >
            <option value="">Select a shift type...</option>
            {shiftTypes.map((t: (typeof shiftTypes)[number]) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm mb-1">Date</label>
            <input
              type="date"
              name="date"
              className="w-full border rounded p-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Start time</label>
            <input
              type="time"
              name="startTime"
              className="w-full border rounded p-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1">End time</label>
            <input
              type="time"
              name="endTime"
              className="w-full border rounded p-2"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Location</label>
            <select
              name="location"
              className="w-full border rounded p-2"
              required
            >
              <option value="">Select a location...</option>
              {LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Capacity</label>
            <input
              type="number"
              name="capacity"
              min={1}
              step={1}
              className="w-full border rounded p-2"
              placeholder="e.g. 6"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">Notes (optional)</label>
          <textarea
            name="notes"
            className="w-full border rounded p-2"
            rows={3}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Link href="/admin/shifts" className="btn btn-secondary">
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary">
            Create shift
          </button>
        </div>
      </form>
    </div>
  );
}
