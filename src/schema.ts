import { z } from "zod";

export const suggestionRequestSchema = z.object({
  questionnaireVersion: z.literal("v1"),
  answers: z.record(z.unknown())
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

export type SuggestionResponse = z.infer<typeof suggestionSchema>;
export type RawAnswersMap = Record<string, unknown>;
export type SuggestionRequestBody = z.infer<typeof suggestionRequestSchema>;
