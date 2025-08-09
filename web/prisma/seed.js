const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const { addDays, set } = require("date-fns");

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@everybodyeats.nz";
  const volunteerEmail = "volunteer@example.com";

  const adminHash = await bcrypt.hash("admin123", 10);
  const volunteerHash = await bcrypt.hash("volunteer123", 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Admin",
      hashedPassword: adminHash,
      role: "ADMIN",
    },
  });

  const volunteer = await prisma.user.upsert({
    where: { email: volunteerEmail },
    update: {},
    create: {
      email: volunteerEmail,
      name: "Sample Volunteer",
      hashedPassword: volunteerHash,
      role: "VOLUNTEER",
    },
  });

  // Additional volunteers for seeding full and waitlisted shifts
  const extraVolunteers = [];
  for (let i = 1; i <= 20; i++) {
    const email = `vol${i}@example.com`;
    const u = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: `Volunteer ${i}`,
        hashedPassword: volunteerHash,
        role: "VOLUNTEER",
      },
    });
    extraVolunteers.push(u);
  }

  const kitchen = await prisma.shiftType.upsert({
    where: { name: "Kitchen" },
    update: {},
    create: { name: "Kitchen", description: "Food prep and cooking support" },
  });
  const front = await prisma.shiftType.upsert({
    where: { name: "Front of House" },
    update: {},
    create: {
      name: "Front of House",
      description: "Serving, greeting, table support",
    },
  });
  const dishes = await prisma.shiftType.upsert({
    where: { name: "Dishwashing" },
    update: {},
    create: {
      name: "Dishwashing",
      description: "Cleaning and dishwashing duties",
    },
  });

  const today = new Date();
  const baseTimes = [
    { startHour: 9, endHour: 12 },
    { startHour: 12, endHour: 15 },
    { startHour: 17, endHour: 21 },
  ];
  const types = [kitchen, front, dishes];
  const LOCATIONS = ["Wellington", "Glenn Innes", "Onehunga"];

  const createdShifts = [];

  for (let i = 0; i < 5; i++) {
    const date = addDays(today, i + 1);
    for (let ti = 0; ti < types.length; ti++) {
      const t = types[ti];
      for (let si = 0; si < baseTimes.length; si++) {
        const slot = baseTimes[si];
        const start = set(date, {
          hours: slot.startHour,
          minutes: 0,
          seconds: 0,
          milliseconds: 0,
        });
        const end = set(date, {
          hours: slot.endHour,
          minutes: 0,
          seconds: 0,
          milliseconds: 0,
        });
        const location =
          LOCATIONS[
            (i * types.length * baseTimes.length + ti * baseTimes.length + si) %
              LOCATIONS.length
          ];
        const shift = await prisma.shift.create({
          data: {
            shiftTypeId: t.id,
            start,
            end,
            location,
            capacity: t.name === "Kitchen" ? 6 : 4,
            notes: i === 0 ? "Bring closed-toe shoes" : null,
          },
        });
        createdShifts.push(shift);
      }
    }
  }

  // Ensure the sample volunteer is signed up for the first shift
  const firstShift = await prisma.shift.findFirst({
    orderBy: { start: "asc" },
  });
  if (firstShift) {
    await prisma.signup.upsert({
      where: {
        userId_shiftId: { userId: volunteer.id, shiftId: firstShift.id },
      },
      update: {},
      create: {
        userId: volunteer.id,
        shiftId: firstShift.id,
        status: "CONFIRMED",
      },
    });
  }

  // Make some shifts full and add a waitlisted signup to demonstrate UI state
  let extraIndex = 0;
  for (let i = 0; i < createdShifts.length; i++) {
    const s = createdShifts[i];
    // Every 4th shift: fill to capacity and add one waitlisted
    if (i % 4 === 0) {
      const capacity = s.capacity;
      // Create confirmed signups to fill the shift
      for (let c = 0; c < capacity; c++) {
        const user = extraVolunteers[(extraIndex + c) % extraVolunteers.length];
        await prisma.signup.upsert({
          where: { userId_shiftId: { userId: user.id, shiftId: s.id } },
          update: { status: "CONFIRMED" },
          create: { userId: user.id, shiftId: s.id, status: "CONFIRMED" },
        });
      }
      extraIndex = (extraIndex + capacity) % extraVolunteers.length;

      // Add one waitlisted person as well
      const waitlister = extraVolunteers[extraIndex % extraVolunteers.length];
      await prisma.signup.upsert({
        where: { userId_shiftId: { userId: waitlister.id, shiftId: s.id } },
        update: { status: "WAITLISTED" },
        create: { userId: waitlister.id, shiftId: s.id, status: "WAITLISTED" },
      });
      extraIndex = (extraIndex + 1) % extraVolunteers.length;
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
