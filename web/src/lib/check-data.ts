import { prisma } from "@/lib/prisma";

async function checkData() {
  try {
    console.log("🔍 Checking database data...");

    // Get all users
    const users = await prisma.user.findMany({
      select: { id: true, email: true, role: true, createdAt: true },
    });
    console.log(`👥 Users (${users.length}):`);
    users.forEach((user: any) => {
      console.log(
        `  - ${user.email} (${
          user.role
        }) - created ${user.createdAt.toDateString()}`
      );
    });

    // Get all shifts
    const shifts = await prisma.shift.findMany({
      include: { shiftType: true },
      orderBy: { start: "desc" },
      take: 10,
    });
    console.log(`\n📅 Recent Shifts (${shifts.length}):`);
    shifts.forEach((shift: any) => {
      console.log(
        `  - ${shift.shiftType.name} on ${shift.start.toDateString()} (${
          shift.start.toTimeString().split(" ")[0]
        } - ${shift.end.toTimeString().split(" ")[0]})`
      );
    });

    // Get all signups
    const signups = await prisma.signup.findMany({
      include: {
        user: { select: { email: true } },
        shift: { include: { shiftType: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    console.log(`\n✍️ Recent Signups (${signups.length}):`);
    signups.forEach((signup: any) => {
      console.log(
        `  - ${signup.user.email} → ${signup.shift.shiftType.name} (${
          signup.status
        }) on ${signup.shift.start.toDateString()}`
      );
    });

    // Check completed shifts by user
    console.log(`\n🎯 Completed shifts by user:`);
    for (const user of users.filter((u: any) => u.role === "VOLUNTEER")) {
      const completedShifts = await prisma.signup.count({
        where: {
          userId: user.id,
          status: "CONFIRMED",
          shift: { end: { lt: new Date() } },
        },
      });
      console.log(`  - ${user.email}: ${completedShifts} completed shifts`);
    }
  } catch (error) {
    console.error("❌ Error checking data:", error);
  }
}

// Allow running this script directly
if (require.main === module) {
  checkData()
    .then(() => {
      console.log("✅ Data check completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Data check failed:", error);
      process.exit(1);
    });
}
