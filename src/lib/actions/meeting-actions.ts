"use server";

import { AIRequestType, MeetingSourceType, SharePermission, TaskStatus } from "@prisma/client";
import { redirect, unstable_rethrow } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAIProvider } from "@/lib/providers/index";
import { enqueueMeetingProcessing } from "@/lib/services/process-queue";
import { storeUploadedFile, type StoredFile, type UploadKind } from "@/lib/services/storage";
import { canCreateMeeting, canUseAi, canUseStorage, incrementUsage } from "@/lib/usage";
import { askAiSchema, meetingSchema, shareMeetingSchema } from "@/lib/validations/meeting";
import { updateTaskSchema } from "@/lib/validations/extension";

function readPreUploadedFile(formData: FormData, kind: UploadKind): StoredFile | null {
  const storageKey = formData.get(`${kind}StorageKey`);
  if (typeof storageKey !== "string" || !storageKey) {
    return null;
  }

  const originalName = String(formData.get(`${kind}OriginalName`) || "");
  const size = Number(formData.get(`${kind}Size`) || 0);

  if (!originalName || !size) {
    throw new Error(`Metadados invalidos para upload de ${kind}.`);
  }

  return { storageKey, originalName, size };
}

async function resolveUploadedFile(
  formData: FormData,
  kind: UploadKind,
  fileField: string,
): Promise<StoredFile | null> {
  const preUploaded = readPreUploadedFile(formData, kind);
  if (preUploaded) {
    return preUploaded;
  }

  return storeUploadedFile(formData.get(fileField) as File | null, kind);
}

export async function createMeetingAction(formData: FormData) {
  const user = await requireUser();

  try {
  const limitCheck = await canCreateMeeting(user);

  if (!limitCheck.allowed) {
    redirect("/meetings/new?error=Seu plano atingiu o limite mensal de reunioes.");
  }

  const parsed = meetingSchema.safeParse({
    title: formData.get("title"),
    clientId: formData.get("clientId") || undefined,
    meetingDate: formData.get("meetingDate"),
    platform: formData.get("platform"),
    language: formData.get("language"),
    participantsText: formData.get("participantsText") || undefined,
    transcriptText: formData.get("transcriptText") || undefined,
    meetingUrl: formData.get("meetingUrl") || undefined,
    sourceType: formData.get("sourceType"),
    consentConfirmed: formData.get("consentConfirmed"),
  });

  if (!parsed.success) {
    redirect(`/meetings/new?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Dados invalidos.")}`);
  }

  if (parsed.data.clientId) {
    const client = await prisma.client.findFirst({
      where: {
        id: parsed.data.clientId,
        userId: user.id,
      },
      select: { id: true },
    });

    if (!client) {
      redirect("/meetings/new?error=Cliente invalido ou sem permissao.");
    }
  }

  let audioFile;
  let videoFile;
  let transcriptFile;

  try {
    [audioFile, videoFile, transcriptFile] = await Promise.all([
      resolveUploadedFile(formData, "audio", "audioFile"),
      resolveUploadedFile(formData, "video", "videoFile"),
      resolveUploadedFile(formData, "transcript", "transcriptFile"),
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao validar upload.";
    redirect(`/meetings/new?error=${encodeURIComponent(message)}`);
  }

  const totalUploadBytes = (audioFile?.size || 0) + (videoFile?.size || 0) + (transcriptFile?.size || 0);
  const storageCheck = await canUseStorage(user, totalUploadBytes);

  if (!storageCheck.allowed) {
    redirect("/meetings/new?error=Seu plano atingiu o limite de armazenamento.");
  }

  const transcriptFromFile =
    transcriptFile && formData.get("transcriptText")
      ? `${String(formData.get("transcriptText"))}\n\nArquivo importado: ${transcriptFile.originalName}`
      : String(formData.get("transcriptText") || "");

  const participants = String(parsed.data.participantsText || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  const meeting = await prisma.meeting.create({
    data: {
      userId: user.id,
      clientId: parsed.data.clientId || null,
      title: parsed.data.title,
      meetingDate: new Date(parsed.data.meetingDate),
      platform: parsed.data.platform,
      language: parsed.data.language,
      meetingUrl: parsed.data.meetingUrl || null,
      sourceType: parsed.data.sourceType as MeetingSourceType,
      participantsText: parsed.data.participantsText || null,
      participantCount: participants.length,
      transcriptText: transcriptFromFile || null,
      consentConfirmed: true,
      audioStorageKey: audioFile?.storageKey || null,
      videoStorageKey: videoFile?.storageKey || null,
      transcriptImportStorageKey: transcriptFile?.storageKey || null,
      audioOriginalName: audioFile?.originalName || null,
      videoOriginalName: videoFile?.originalName || null,
      transcriptOriginalName: transcriptFile?.originalName || null,
      status: transcriptFromFile || audioFile || videoFile ? "uploaded" : "draft",
      participants: {
        create: participants.map((name) => ({ name })),
      },
    },
  });

  await incrementUsage(user.id, {
    meetings: 1,
    storageBytes: totalUploadBytes,
  });

  if (formData.get("startProcessing")) {
    await enqueueMeetingProcessing(meeting.id);
    redirect(`/meetings/${meeting.id}?success=Reuniao criada. Processamento iniciado em segundo plano.`);
  }

  redirect(`/meetings/${meeting.id}?success=Reuniao criada com sucesso.`);
  } catch (error) {
    unstable_rethrow(error);
    const message = error instanceof Error ? error.message : "Erro inesperado ao criar reuniao.";
    redirect(`/meetings/new?error=${encodeURIComponent(message)}`);
  }
}

export async function reprocessMeetingAction(formData: FormData) {
  const user = await requireUser();
  const meetingId = String(formData.get("meetingId"));
  const limitCheck = await canUseAi(user, 3);

  if (!limitCheck.allowed) {
    redirect(`/meetings/${meetingId}?error=Seu plano nao possui creditos suficientes para reprocessar.`);
  }

  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, userId: user.id },
  });

  if (!meeting) {
    redirect("/meetings?error=Reuniao nao encontrada.");
  }

  await enqueueMeetingProcessing(meetingId);
  redirect(`/meetings/${meetingId}?success=Reprocessamento iniciado em segundo plano.`);
}

export async function askAiAction(formData: FormData) {
  const user = await requireUser();
  const meetingId = String(formData.get("meetingId"));
  const limitCheck = await canUseAi(user, 1);

  if (!limitCheck.allowed) {
    redirect(`/meetings/${meetingId}?tab=chat&error=Seu plano atingiu o limite de creditos de IA.`);
  }

  const parsed = askAiSchema.safeParse({
    question: formData.get("question"),
  });

  if (!parsed.success) {
    redirect(`/meetings/${meetingId}?tab=chat&error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Pergunta invalida.")}`);
  }

  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
  });

  if (!meeting || meeting.userId !== user.id) {
    redirect("/meetings?error=Reuniao nao encontrada.");
  }

  const aiProvider = getAIProvider();
  const response = await aiProvider.answerQuestion(meeting.transcriptText || "", parsed.data.question);

  await prisma.aIRequest.create({
    data: {
      userId: user.id,
      meetingId,
      type: AIRequestType.chat,
      prompt: parsed.data.question,
      response,
      creditsUsed: 1,
    },
  });

  await incrementUsage(user.id, { aiCredits: 1 });

  redirect(`/meetings/${meetingId}?tab=chat&success=Pergunta respondida.`);
}

export async function shareMeetingAction(formData: FormData) {
  const user = await requireUser();
  const meetingId = String(formData.get("meetingId"));

  const parsed = shareMeetingSchema.safeParse({
    email: formData.get("email"),
    permission: formData.get("permission"),
  });

  if (!parsed.success) {
    redirect(`/meetings/${meetingId}?tab=overview&error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Dados invalidos.")}`);
  }

  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, userId: user.id },
  });

  if (!meeting) {
    redirect("/meetings?error=Reuniao nao encontrada.");
  }

  await prisma.meetingShare.upsert({
    where: {
      meetingId_sharedWithEmail: {
        meetingId,
        sharedWithEmail: parsed.data.email.toLowerCase(),
      },
    },
    update: {
      permission: parsed.data.permission as SharePermission,
    },
    create: {
      meetingId,
      sharedWithEmail: parsed.data.email.toLowerCase(),
      permission: parsed.data.permission as SharePermission,
    },
  });

  redirect(`/meetings/${meetingId}?tab=overview&success=Reuniao compartilhada.`);
}

export async function updateTaskAction(formData: FormData) {
  const user = await requireUser();
  const parsed = updateTaskSchema.safeParse({
    taskId: formData.get("taskId"),
    meetingId: formData.get("meetingId"),
    responsibleName: formData.get("responsibleName") || undefined,
    dueDate: formData.get("dueDate") || undefined,
    status: formData.get("status"),
  });

  if (!parsed.success) {
    redirect("/meetings?error=Dados da tarefa invalidos.");
  }

  const { taskId, meetingId } = parsed.data;

  const task = await prisma.meetingTask.findUnique({
    where: { id: taskId },
    include: { meeting: true },
  });

  if (!task || task.meeting.userId !== user.id || task.meetingId !== meetingId) {
    redirect("/meetings?error=Tarefa nao encontrada.");
  }

  await prisma.meetingTask.update({
    where: { id: taskId },
    data: {
      responsibleName: parsed.data.responsibleName || "",
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      status: parsed.data.status as TaskStatus,
    },
  });

  redirect(`/meetings/${meetingId}?tab=tasks&success=Tarefa atualizada.`);
}

export async function archiveMeetingAction(formData: FormData) {
  const user = await requireUser();
  const meetingId = String(formData.get("meetingId"));

  const result = await prisma.meeting.updateMany({
    where: { id: meetingId, userId: user.id },
    data: { status: "archived" },
  });

  if (result.count === 0) {
    redirect("/meetings?error=Reuniao nao encontrada.");
  }

  redirect("/archive?success=Reuniao arquivada.");
}
