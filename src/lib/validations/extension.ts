import { z } from "zod";
import { meetingLanguages, meetingPlatforms } from "@/lib/constants";

export const extensionMeetingStartSchema = z.object({
  title: z.string().trim().min(3).max(160),
  platform: z.enum(meetingPlatforms),
  meeting_url: z.url().max(500).optional(),
  language: z.enum(meetingLanguages),
});

export const extensionTranscriptSegmentSchema = z.object({
  speaker_name: z.string().trim().min(1).max(100).optional(),
  start_time_seconds: z.coerce.number().min(0).max(60 * 60 * 12),
  end_time_seconds: z.coerce.number().min(0).max(60 * 60 * 12),
  text: z.string().trim().min(1).max(12_000),
});

export const updateTaskSchema = z.object({
  taskId: z.string().cuid(),
  meetingId: z.string().cuid(),
  responsibleName: z.string().trim().max(120).optional(),
  dueDate: z.string().optional(),
  status: z.enum(["pending", "in_progress", "completed"]),
});
