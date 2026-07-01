import { NextResponse } from "next/server";
import { authenticateExtensionRequest } from "@/lib/extension-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await authenticateExtensionRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const meeting = await prisma.meeting.findFirst({
    where: { id, userId: user.id },
    include: {
      transcriptSegments: true,
      tasks: true,
    },
  });

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found." }, { status: 404 });
  }

  return NextResponse.json(meeting);
}
