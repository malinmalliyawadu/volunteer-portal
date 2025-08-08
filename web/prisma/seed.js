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

  for (let i = 0; i < 5; i++) {
    const date = addDays(today, i + 1);
    for (const t of types) {
      for (const slot of baseTimes) {
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
        await prisma.shift.create({
          data: {
            shiftTypeId: t.id,
            start,
            end,
            location: "Auckland CBD",
            capacity: t.name === "Kitchen" ? 6 : 4,
            notes: i === 0 ? "Bring closed-toe shoes" : null,
          },
        });
      }
    }
  }

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
