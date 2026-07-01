import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildMinutesMarkdown, formatDateTime } from "@/lib/utils";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const meeting = await prisma.meeting.findFirst({
    where: { id, userId: user.id },
    include: { participants: true, tasks: true },
  });

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found." }, { status: 404 });
  }

  const markdown = buildMinutesMarkdown({
    title: meeting.title,
    summary: meeting.summaryText || "",
    participants: meeting.participants.map((item) => item.name),
    highlights: (meeting.summaryText || "").split(". ").filter(Boolean).slice(0, 3),
    decisions: meeting.decisionsText?.split("\n").filter(Boolean) || [],
    tasks: meeting.tasks.map((task) => ({
      title: task.title,
      responsible: task.responsibleName,
      dueDate: task.dueDate ? formatDateTime(task.dueDate) : null,
      status: task.status,
    })),
    risks: meeting.risksText?.split(". ").filter(Boolean) || [],
    nextSteps: meeting.nextStepsText?.split(". ").filter(Boolean) || [],
    followUp: meeting.followUpText || "",
  });

  return new NextResponse(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${meeting.title.toLowerCase().replaceAll(/\s+/g, "-")}-ata.md"`,
    },
  });
}
