import { NextResponse } from "next/server";
import { MeetingSourceType } from "@prisma/client";
import { authenticateExtensionRequest, ensureJsonRequest } from "@/lib/extension-auth";
import { prisma } from "@/lib/prisma";
import { enqueueMeetingProcessing } from "@/lib/services/process-queue";
import { canCreateMeeting, incrementUsage } from "@/lib/usage";
import { extensionMeetingStartSchema } from "@/lib/validations/extension";

export async function POST(request: Request) {
  if (!ensureJsonRequest(request)) {
    return NextResponse.json({ error: "Unsupported content type." }, { status: 415 });
  }

  const user = await authenticateExtensionRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limitCheck = await canCreateMeeting(user.id, user.plan);
  if (!limitCheck.allowed) {
    return NextResponse.json({ error: "Monthly meeting limit reached." }, { status: 402 });
  }

  const parsed = extensionMeetingStartSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
  }

  const meeting = await prisma.meeting.create({
    data: {
      userId: user.id,
      title: parsed.data.title,
      platform: parsed.data.platform,
      meetingDate: new Date(),
      meetingUrl: parsed.data.meeting_url,
      language: parsed.data.language,
      sourceType: MeetingSourceType.chrome_extension,
      status: "uploaded",
      consentConfirmed: true,
    },
  });

  await incrementUsage(user.id, { meetings: 1 });

  return NextResponse.json({ ok: true, meetingId: meeting.id });
}
