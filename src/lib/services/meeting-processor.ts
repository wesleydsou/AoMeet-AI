import { AIRequestType, MeetingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAIProvider, getTranscriptionProvider } from "@/lib/providers/index";
import { incrementUsage, decrementUsage } from "@/lib/usage";
import { purgeMeetingMediaFiles } from "@/lib/services/storage";
import { normalizeAiTextField } from "@/lib/utils";

async function buildTranscriptFromSegments(meetingId: string) {
  const segments = await prisma.meetingTranscriptSegment.findMany({
    where: { meetingId },
    orderBy: { startTimeSeconds: "asc" },
  });

  if (!segments.length) {
    return "";
  }

  return segments.map((segment) => `[${segment.speakerName}] ${segment.text}`).join("\n");
}

async function logStep(meetingId: string, step: string, status: string, message: string, metadata?: Record<string, unknown>) {
  await prisma.processingLog.create({
    data: {
      meetingId,
      step,
      status,
      message,
      metadataJson: metadata ? JSON.stringify(metadata) : null,
    },
  });
}

export async function processMeeting(meetingId: string) {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: { participants: true, user: true },
  });

  if (!meeting) {
    throw new Error("Meeting not found.");
  }

  const transcriptionProvider = getTranscriptionProvider();
  const aiProvider = getAIProvider();

  try {
    await logStep(meetingId, "start", "running", "Fluxo de processamento iniciado.");

    await prisma.meeting.update({
      where: { id: meetingId },
      data: { status: MeetingStatus.transcribing, processingError: null },
    });

    let transcript = meeting.transcriptText?.trim() || (await buildTranscriptFromSegments(meetingId));

    if (!transcript && meeting.audioStorageKey) {
      transcript = await transcriptionProvider.transcribeAudio(meeting.audioStorageKey, meeting.language);
    }

    if (!transcript && meeting.videoStorageKey) {
      transcript = await transcriptionProvider.transcribeVideo(meeting.videoStorageKey, meeting.language);
    }

    if (!transcript?.trim()) {
      throw new Error("Nenhuma transcricao disponivel para processamento.");
    }

    transcript = await transcriptionProvider.cleanupTranscript(transcript);

    const bytesFreed = await purgeMeetingMediaFiles({
      audioStorageKey: meeting.audioStorageKey,
      videoStorageKey: meeting.videoStorageKey,
      transcriptImportStorageKey: meeting.transcriptImportStorageKey,
    });

    if (bytesFreed > 0) {
      await decrementUsage(meeting.userId, { storageBytes: bytesFreed });
    }

    await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        audioStorageKey: null,
        videoStorageKey: null,
        transcriptImportStorageKey: null,
        audioOriginalName: null,
        videoOriginalName: null,
        transcriptOriginalName: null,
      },
    });

    await logStep(meetingId, "storage_purge", "done", "Arquivos de midia removidos apos transcricao.", {
      bytesFreed,
    });

    await logStep(meetingId, "cleanup", "done", "Transcricao consolidada.", { transcriptLength: transcript.length });

    await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        transcriptText: transcript,
        status: MeetingStatus.summarizing,
      },
    });

    const [summaryData, tasks, decisions] = await Promise.all([
      aiProvider.generateMeetingSummary(transcript),
      aiProvider.extractTasks(transcript),
      aiProvider.extractDecisions(transcript),
    ]);

    const followUp = await aiProvider.generateFollowUpEmail(summaryData.summary);

    await prisma.meetingTask.deleteMany({ where: { meetingId } });

    await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        summaryText: summaryData.summary,
        decisionsText: decisions.join("\n"),
        tasksText: tasks.map((item) => item.title).join("\n"),
        risksText: normalizeAiTextField(summaryData.risks),
        nextStepsText: normalizeAiTextField(summaryData.nextSteps),
        followUpText: followUp,
        aiChatContext: transcript,
        status: MeetingStatus.completed,
        processingError: null,
        tasks: {
          create: tasks.map((task) => ({
            title: task.title,
            description: task.description,
            responsibleName: task.responsibleName,
            dueDate: task.dueDate ? new Date(task.dueDate) : null,
          })),
        },
      },
    });

    await prisma.aIRequest.createMany({
      data: [
        {
          userId: meeting.userId,
          meetingId,
          type: AIRequestType.summary,
          prompt: "Gerar resumo executivo",
          response: summaryData.summary,
          creditsUsed: 1,
        },
        {
          userId: meeting.userId,
          meetingId,
          type: AIRequestType.tasks,
          prompt: "Extrair tarefas",
          response: tasks.map((item) => item.title).join("\n"),
          creditsUsed: 1,
        },
        {
          userId: meeting.userId,
          meetingId,
          type: AIRequestType.decisions,
          prompt: "Extrair decisoes",
          response: decisions.join("\n"),
          creditsUsed: 1,
        },
      ],
    });

    await incrementUsage(meeting.userId, { aiCredits: 3 });

    await logStep(meetingId, "finish", "done", "Resumo, tarefas e decisoes gerados com sucesso.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido no processamento.";

    await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        status: MeetingStatus.failed,
        processingError: message,
      },
    });

    await logStep(meetingId, "error", "failed", message);

    throw error;
  }
}

export async function consolidateMeetingTranscript(meetingId: string) {
  const transcript = await buildTranscriptFromSegments(meetingId);

  if (!transcript) {
    return;
  }

  await prisma.meeting.update({
    where: { id: meetingId },
    data: { transcriptText: transcript },
  });
}
