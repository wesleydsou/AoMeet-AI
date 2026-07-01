import { NextResponse } from "next/server";
import { authenticateExtensionRequest, ensureJsonRequest } from "@/lib/extension-auth";
import { prisma } from "@/lib/prisma";
import { extensionTranscriptSegmentSchema } from "@/lib/validations/extension";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!ensureJsonRequest(request)) {
    return NextResponse.json({ error: "Unsupported content type." }, { status: 415 });
  }

  const user = await authenticateExtensionRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const parsed = extensionTranscriptSegmentSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
  }

  const meeting = await prisma.meeting.findFirst({
    where: { id, userId: user.id },
  });

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found." }, { status: 404 });
  }

  await prisma.meetingTranscriptSegment.create({
    data: {
      meetingId: id,
      speakerName: parsed.data.speaker_name || "Speaker",
      startTimeSeconds: parsed.data.start_time_seconds,
      endTimeSeconds: parsed.data.end_time_seconds,
      text: parsed.data.text,
    },
  });

  if (parsed.data.speaker_name) {
    await prisma.meeting.update({
      where: { id },
      data: {
        participantCount: Math.max(meeting.participantCount, 1),
      },
    });
  }

  return NextResponse.json({ ok: true });
}
