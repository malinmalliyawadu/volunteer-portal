-- CreateEnum
CREATE TYPE "public"."EmailNotificationType" AS ENUM ('SHIFT_SHORTAGE', 'SHIFT_REMINDER', 'SHIFT_CANCELED', 'VOLUNTEER_WELCOME', 'CUSTOM');

-- CreateEnum
CREATE TYPE "public"."EmailStatus" AS ENUM ('DRAFT', 'QUEUED', 'SENT', 'FAILED', 'PARTIALLY_SENT');

-- CreateEnum
CREATE TYPE "public"."RecipientStatus" AS ENUM ('SENT', 'OPENED', 'CLICKED', 'BOUNCED', 'UNSUBSCRIBED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."EmailTemplateType" AS ENUM ('SHIFT_SHORTAGE', 'SHIFT_REMINDER', 'SHIFT_CANCELED', 'WELCOME', 'CUSTOM');

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "maxNotificationsPerWeek" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "receiveShortageNotifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "shortageNotificationTypes" TEXT[];

-- CreateTable
CREATE TABLE "public"."EmailNotification" (
    "id" TEXT NOT NULL,
    "type" "public"."EmailNotificationType" NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlContent" TEXT NOT NULL,
    "textContent" TEXT,
    "recipientCount" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentBy" TEXT NOT NULL,
    "shiftId" TEXT,
    "groupId" TEXT,
    "status" "public"."EmailStatus" NOT NULL DEFAULT 'SENT',
    "campaignId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmailRecipient" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "recipientName" TEXT,
    "status" "public"."RecipientStatus" NOT NULL DEFAULT 'SENT',
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "unsubscribedAt" TIMESTAMP(3),
    "bouncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NotificationGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "filters" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NotificationGroupMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationGroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmailTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."EmailTemplateType" NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlContent" TEXT NOT NULL,
    "textContent" TEXT,
    "variables" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailNotification_type_sentAt_idx" ON "public"."EmailNotification"("type", "sentAt");

-- CreateIndex
CREATE INDEX "EmailNotification_shiftId_idx" ON "public"."EmailNotification"("shiftId");

-- CreateIndex
CREATE INDEX "EmailRecipient_notificationId_status_idx" ON "public"."EmailRecipient"("notificationId", "status");

-- CreateIndex
CREATE INDEX "EmailRecipient_recipientEmail_idx" ON "public"."EmailRecipient"("recipientEmail");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationGroup_name_key" ON "public"."NotificationGroup"("name");

-- CreateIndex
CREATE INDEX "NotificationGroupMember_groupId_idx" ON "public"."NotificationGroupMember"("groupId");

-- CreateIndex
CREATE INDEX "NotificationGroupMember_userId_idx" ON "public"."NotificationGroupMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationGroupMember_groupId_userId_key" ON "public"."NotificationGroupMember"("groupId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_name_key" ON "public"."EmailTemplate"("name");

-- AddForeignKey
ALTER TABLE "public"."EmailNotification" ADD CONSTRAINT "EmailNotification_sentBy_fkey" FOREIGN KEY ("sentBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmailNotification" ADD CONSTRAINT "EmailNotification_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "public"."Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmailNotification" ADD CONSTRAINT "EmailNotification_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."NotificationGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmailRecipient" ADD CONSTRAINT "EmailRecipient_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "public"."EmailNotification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NotificationGroupMember" ADD CONSTRAINT "NotificationGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."NotificationGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NotificationGroupMember" ADD CONSTRAINT "NotificationGroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
