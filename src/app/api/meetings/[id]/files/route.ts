import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readStoredFile } from "@/lib/services/storage";

const FILE_TYPES = {
  audio: "audioStorageKey",
  video: "videoStorageKey",
  transcript: "transcriptImportStorageKey",
} as const;

const ORIGINAL_NAMES = {
  audio: "audioOriginalName",
  video: "videoOriginalName",
  transcript: "transcriptOriginalName",
} as const;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const type = new URL(request.url).searchParams.get("type");

  if (!type || !(type in FILE_TYPES)) {
    return NextResponse.json({ error: "Invalid file type." }, { status: 400 });
  }

  const meeting = await prisma.meeting.findFirst({
    where: { id, userId: user.id },
  });

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found." }, { status: 404 });
  }

  const storageKey = meeting[FILE_TYPES[type as keyof typeof FILE_TYPES]] as string | null;
  const originalName = meeting[ORIGINAL_NAMES[type as keyof typeof ORIGINAL_NAMES]] as string | null;

  if (!storageKey) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  const buffer = await readStoredFile(storageKey);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${(originalName || `${type}-file`).replaceAll('"', "")}"`,
    },
  });
}
