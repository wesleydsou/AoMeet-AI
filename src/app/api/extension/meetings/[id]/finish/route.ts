import { NextResponse } from "next/server";
import { authenticateExtensionRequest } from "@/lib/extension-auth";
import { prisma } from "@/lib/prisma";
import { consolidateMeetingTranscript } from "@/lib/services/meeting-processor";
import { enqueueMeetingProcessing } from "@/lib/services/process-queue";
import { canUseAi } from "@/lib/usage";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await authenticateExtensionRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const meeting = await prisma.meeting.findFirst({
    where: { id, userId: user.id },
  });

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found." }, { status: 404 });
  }

  const limitCheck = await canUseAi(user, 3);
  if (!limitCheck.allowed) {
    return NextResponse.json({ error: "AI credit limit reached." }, { status: 402 });
  }

  await consolidateMeetingTranscript(id);
  await enqueueMeetingProcessing(id);

  return NextResponse.json({ ok: true });
}
