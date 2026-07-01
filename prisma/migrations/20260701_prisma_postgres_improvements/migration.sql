-- AlterEnum
ALTER TYPE "public"."MeetingStatus" ADD VALUE IF NOT EXISTS 'queued' BEFORE 'uploaded';

-- AlterTable User
ALTER TABLE "public"."User" RENAME COLUMN "extensionToken" TO "extensionTokenHash";

-- AlterTable Meeting
ALTER TABLE "public"."Meeting" RENAME COLUMN "audioPath" TO "audioStorageKey";
ALTER TABLE "public"."Meeting" RENAME COLUMN "videoPath" TO "videoStorageKey";
ALTER TABLE "public"."Meeting" RENAME COLUMN "transcriptImportPath" TO "transcriptImportStorageKey";
ALTER TABLE "public"."Meeting" ADD COLUMN "audioOriginalName" TEXT;
ALTER TABLE "public"."Meeting" ADD COLUMN "videoOriginalName" TEXT;
ALTER TABLE "public"."Meeting" ADD COLUMN "transcriptOriginalName" TEXT;
ALTER TABLE "public"."Meeting" ADD COLUMN "processingError" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "MeetingShare_meetingId_sharedWithEmail_key" ON "public"."MeetingShare"("meetingId", "sharedWithEmail");
