import { prisma } from "@/lib/prisma";
import { ACHIEVEMENT_DEFINITIONS } from "@/lib/achievements";

export async function seedAchievements() {
  console.log("🎯 Seeding achievements...");

  for (const achievementDef of ACHIEVEMENT_DEFINITIONS) {
    try {
      await prisma.achievement.upsert({
        where: { name: achievementDef.name },
        update: {
          description: achievementDef.description,
          category: achievementDef.category,
          icon: achievementDef.icon,
          criteria: achievementDef.criteria,
          points: achievementDef.points,
          isActive: true,
        },
        create: {
          name: achievementDef.name,
          description: achievementDef.description,
          category: achievementDef.category,
          icon: achievementDef.icon,
          criteria: achievementDef.criteria,
          points: achievementDef.points,
          isActive: true,
        },
      });
      console.log(`✅ Seeded achievement: ${achievementDef.name}`);
    } catch (error) {
      console.error(
        `❌ Error seeding achievement ${achievementDef.name}:`,
        error
      );
    }
  }

  console.log("🎯 Achievements seeding completed!");
}

// Allow running this script directly
if (require.main === module) {
  seedAchievements()
    .then(() => {
      console.log("✅ Achievement seeding completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Achievement seeding failed:", error);
      process.exit(1);
    });
}
