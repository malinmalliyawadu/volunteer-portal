/*
  Warnings:

  - You are about to drop the column `endDate` on the `RegularVolunteer` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `RegularVolunteer` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."RegularVolunteer" DROP COLUMN "endDate",
DROP COLUMN "startDate";
