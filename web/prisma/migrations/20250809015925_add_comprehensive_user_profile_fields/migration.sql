/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `ShiftType` will be added. If there are existing duplicate values, this will fail.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "dateOfBirth" DATETIME,
    "pronouns" TEXT,
    "profilePhotoUrl" TEXT,
    "hashedPassword" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'VOLUNTEER',
    "emergencyContactName" TEXT,
    "emergencyContactRelationship" TEXT,
    "emergencyContactPhone" TEXT,
    "medicalConditions" TEXT,
    "willingToProvideReference" BOOLEAN NOT NULL DEFAULT false,
    "howDidYouHearAboutUs" TEXT,
    "availableDays" TEXT,
    "availableLocations" TEXT,
    "emailNewsletterSubscription" BOOLEAN NOT NULL DEFAULT true,
    "notificationPreference" TEXT NOT NULL DEFAULT 'EMAIL',
    "volunteerAgreementAccepted" BOOLEAN NOT NULL DEFAULT false,
    "healthSafetyPolicyAccepted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "email", "hashedPassword", "id", "name", "phone", "role", "updatedAt") SELECT "createdAt", "email", "hashedPassword", "id", "name", "phone", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ShiftType_name_key" ON "ShiftType"("name");
