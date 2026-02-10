import { z } from "zod";

export const suggestionRequestSchema = z.object({
  questionnaireVersion: z.literal("v1"),
  answers: z.record(z.string(), z.unknown())
});

export const suggestionSchema = z.object({
  summary: z.string(),
  top_actions: z.array(z.object({
    title: z.string(),
    estimated_reduction_kg_per_year: z.number(),
    difficulty: z.enum(["easy", "medium", "hard"]),
    reason: z.string()
  }))
});

export const dailyTaskSchema = z.object({
  title: z.string(),
  carbonOffsetKg: z.number(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  reason: z.string().optional()
});

export const dailyTasksSchema = z.object({
  tasks: z.array(dailyTaskSchema).length(10)
});

export const completeTaskRequestSchema = z.object({
  dailyTaskId: z.string().min(1),
  imageUrl: z.string().url().optional()
});

export const addFriendRequestSchema = z.object({
  email: z.string().email()
});

export const createCommunityRequestSchema = z.object({
  name: z.string().min(1)
});

export const joinCommunityRequestSchema = z.object({
  communityId: z.string().min(1)
});

export type SuggestionResponse = z.infer<typeof suggestionSchema>;
export type DailyTasksResponse = z.infer<typeof dailyTasksSchema>;
export type RawAnswersMap = Record<string, unknown>;
export type SuggestionRequestBody = z.infer<typeof suggestionRequestSchema>;
export type CompleteTaskRequestBody = z.infer<typeof completeTaskRequestSchema>;
export type AddFriendRequestBody = z.infer<typeof addFriendRequestSchema>;
export type CreateCommunityRequestBody = z.infer<typeof createCommunityRequestSchema>;
export type JoinCommunityRequestBody = z.infer<typeof joinCommunityRequestSchema>;
