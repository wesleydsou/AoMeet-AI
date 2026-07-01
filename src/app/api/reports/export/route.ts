import { MeetingStatus, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { meetingStatuses } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { formatDate, serializeCsvValue } from "@/lib/utils";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const search = url.searchParams;
  const rawStatus = search.get("status");
  const selectedStatus =
    rawStatus && rawStatus !== "all" && meetingStatuses.includes(rawStatus as (typeof meetingStatuses)[number])
      ? (rawStatus as MeetingStatus)
      : undefined;

  const where: Prisma.MeetingWhereInput = {
    userId: user.id,
    title: search.get("search") ? { contains: search.get("search") || "" } : undefined,
    platform: search.get("platform") && search.get("platform") !== "all" ? search.get("platform") || undefined : undefined,
    status: selectedStatus,
  };

  const meetings = await prisma.meeting.findMany({
    where,
    orderBy: { meetingDate: "desc" },
  });

  const rows = [
    ["iniciado_em", "titulo", "duracao", "participantes", "plataforma", "status"].join(","),
    ...meetings.map((meeting) =>
      [
        serializeCsvValue(formatDate(meeting.meetingDate)),
        serializeCsvValue(meeting.title),
        serializeCsvValue(meeting.durationSeconds),
        serializeCsvValue(meeting.participantCount),
        serializeCsvValue(meeting.platform),
        serializeCsvValue(meeting.status),
      ].join(","),
    ),
  ];

  return new NextResponse(rows.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="aomeet-reports.csv"',
    },
  });
}
