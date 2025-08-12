import { prisma } from "@/lib/prisma";
import { subDays, subWeeks, subMonths, startOfDay, addHours } from "date-fns";

async function addHistoricalData() {
  try {
    console.log("📅 Adding historical shift data...");

    // Get or create a sample volunteer
    let volunteer = await prisma.user.findUnique({
      where: { email: "sample.volunteer@example.com" },
    });

    if (!volunteer) {
      volunteer = await prisma.user.create({
        data: {
          email: "sample.volunteer@example.com",
          name: "Sam Volunteer",
          hashedPassword:
            "$2a$10$K7L1OdUE5Y6td1XE5VKlV.OT9tO1L.8Y7B2WOo6kR8qK8rK8rK8rK", // dummy hash
          role: "VOLUNTEER",
          createdAt: subMonths(new Date(), 8), // Been volunteering for 8 months
        },
      });
      console.log("✅ Created sample volunteer: sample.volunteer@example.com");
    }

    // Get shift types
    const shiftTypes = await prisma.shiftType.findMany();
    if (shiftTypes.length === 0) {
      console.log("❌ No shift types found. Please run the seed script first.");
      return;
    }

    console.log(`📋 Found ${shiftTypes.length} shift types`);

    // Create historical shifts and signups over the past 8 months
    const historicalData = [
      // 8 months ago - just started
      { weeksAgo: 32, shiftsCount: 1, shiftTypeIndex: 0 },
      { weeksAgo: 31, shiftsCount: 1, shiftTypeIndex: 1 },

      // 7 months ago - getting regular
      { weeksAgo: 28, shiftsCount: 2, shiftTypeIndex: 0 },
      { weeksAgo: 26, shiftsCount: 1, shiftTypeIndex: 2 },

      // 6 months ago - consistent
      { weeksAgo: 24, shiftsCount: 2, shiftTypeIndex: 0 },
      { weeksAgo: 22, shiftsCount: 2, shiftTypeIndex: 1 },

      // 5 months ago - very active
      { weeksAgo: 20, shiftsCount: 3, shiftTypeIndex: 0 },
      { weeksAgo: 18, shiftsCount: 2, shiftTypeIndex: 2 },

      // 4 months ago - continuing
      { weeksAgo: 16, shiftsCount: 2, shiftTypeIndex: 1 },
      { weeksAgo: 14, shiftsCount: 2, shiftTypeIndex: 0 },

      // 3 months ago - regular volunteer
      { weeksAgo: 12, shiftsCount: 3, shiftTypeIndex: 0 },
      { weeksAgo: 10, shiftsCount: 2, shiftTypeIndex: 2 },

      // 2 months ago - very committed
      { weeksAgo: 8, shiftsCount: 3, shiftTypeIndex: 1 },
      { weeksAgo: 6, shiftsCount: 2, shiftTypeIndex: 0 },

      // 1 month ago - experienced volunteer
      { weeksAgo: 4, shiftsCount: 2, shiftTypeIndex: 2 },
      { weeksAgo: 2, shiftsCount: 3, shiftTypeIndex: 0 },
    ];

    let totalShiftsCreated = 0;
    let totalSignupsCreated = 0;

    for (const period of historicalData) {
      console.log(`📅 Creating shifts for ${period.weeksAgo} weeks ago...`);

      for (let i = 0; i < period.shiftsCount; i++) {
        // Create a shift in the past
        const shiftDate = subWeeks(new Date(), period.weeksAgo);
        const shiftStart = addHours(startOfDay(shiftDate), 17 + i * 2); // Stagger times
        const shiftEnd = addHours(shiftStart, 4); // 4-hour shifts

        const shift = await prisma.shift.create({
          data: {
            shiftTypeId:
              shiftTypes[period.shiftTypeIndex % shiftTypes.length].id,
            start: shiftStart,
            end: shiftEnd,
            location: "Community Kitchen - Historical",
            capacity: 6,
            notes: `Historical shift from ${period.weeksAgo} weeks ago`,
          },
        });

        // Create signup for our sample volunteer
        await prisma.signup.create({
          data: {
            userId: volunteer.id,
            shiftId: shift.id,
            status: "CONFIRMED",
            createdAt: subDays(shiftStart, 7), // Signed up a week before
          },
        });

        totalShiftsCreated++;
        totalSignupsCreated++;
      }
    }

    console.log(`✅ Created ${totalShiftsCreated} historical shifts`);
    console.log(
      `✅ Created ${totalSignupsCreated} signups for sample volunteer`
    );

    // Now test achievements for this volunteer
    console.log(`\n🏆 Testing achievements for sample volunteer...`);
    const { checkAndUnlockAchievements, calculateUserProgress } = await import(
      "@/lib/achievements"
    );

    const progress = await calculateUserProgress(volunteer.id);
    console.log("📊 Progress:", progress);

    const newAchievements = await checkAndUnlockAchievements(volunteer.id);
    console.log("🎉 New achievements unlocked:", newAchievements);

    // Get all achievements
    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId: volunteer.id },
      include: { achievement: true },
    });

    console.log(`\n🏆 Total achievements unlocked: ${userAchievements.length}`);
    userAchievements.forEach((ua) => {
      console.log(`  🎯 ${ua.achievement.name} (${ua.achievement.points} pts)`);
    });

    const totalPoints = userAchievements.reduce(
      (sum: number, ua) => sum + ua.achievement.points,
      0
    );
    console.log(`🎯 Total points: ${totalPoints}`);

    console.log(`\n✅ You can now login as: sample.volunteer@example.com`);
    console.log(`   Password: password (or any password - it's just for demo)`);
  } catch (error) {
    console.error("❌ Error adding historical data:", error);
  }
}

// Allow running this script directly
if (require.main === module) {
  addHistoricalData()
    .then(() => {
      console.log("✅ Historical data creation completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Historical data creation failed:", error);
      process.exit(1);
    });
}
