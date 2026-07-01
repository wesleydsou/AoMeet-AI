import { after } from "next/server";
import { MeetingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { processMeeting } from "@/lib/services/meeting-processor";

export async function enqueueMeetingProcessing(meetingId: string) {
  await prisma.meeting.update({
    where: { id: meetingId },
    data: { status: MeetingStatus.queued, processingError: null },
  });

  after(async () => {
    try {
      await processMeeting(meetingId);
    } catch {
      // processMeeting already persists failed status and logs.
    }
  });
}
