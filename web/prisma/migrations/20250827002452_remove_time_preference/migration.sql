/*
  Warnings:

  - You are about to drop the column `timePreference` on the `RegularVolunteer` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."RegularVolunteer" DROP COLUMN "timePreference";

-- DropEnum
DROP TYPE "public"."TimePreference";
