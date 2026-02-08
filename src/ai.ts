import { dailyTasksSchema, type DailyTasksResponse } from "./schema";
import type { QuestionnaireCompressionV1 } from "./questionnaireCompression";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
// Cheapest Gemini model on OpenRouter that still gives solid output for structured tasks
const DEFAULT_MODEL = "google/gemini-2.0-flash-lite-001";

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

type DailyTaskInput = {
  dateKey: string;
  userProfile: {
    username?: string;
    email?: string;
    city?: string;
    initialFootprintKg?: number | null;
    carbonOffsetKgTotal?: number | null;
    questionnaireCompression?: QuestionnaireCompressionV1 | null;
  };
  context?: {
    topActions?: Array<{
      title: string;
      estimated_reduction_kg_per_year: number;
      difficulty: "easy" | "medium" | "hard";
      reason: string;
    }>;
  };
};

function extractJsonContent(raw: string): string {
  const trimmed = raw.trim();

  // Handle accidental fenced blocks just in case
  if (trimmed.startsWith("```")) {
    return trimmed
      .replace(/^```[a-zA-Z]*\s*/, "")
      .replace(/\s*```$/, "")
      .trim();
  }

  return trimmed;
}

function clampTaskValue(value: number, min = 1, max = 10): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

// JSON Schema for OpenRouter Structured Outputs (response_format: json_schema)
const dailyTasksJsonSchema = {
  name: "daily_tasks",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["tasks"],
    properties: {
      tasks: {
        type: "array",
        minItems: 10,
        maxItems: 10,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title", "carbonOffsetKg", "difficulty", "reason"],
          properties: {
            title: { type: "string" },
            carbonOffsetKg: { type: "number" },
            difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
            reason: { type: "string" },
          },
        },
      },
    },
  },
} as const;

export async function generateDailyTasks(
  input: DailyTaskInput,
): Promise<DailyTasksResponse | null> {
  const apiKey =
    process.env.OPENROUTER_API_KEY ?? process.env.OPENROUTER_APIKEY;
  const model = process.env.MODEL_ID || DEFAULT_MODEL;

  if (!apiKey) {
    console.error("OPENROUTER_API_KEY is missing.");
    return null;
  }

  let rawContent: string | undefined;

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,

        // Optional but recommended by OpenRouter (helps attribution / analytics)
        // Set these in env if you want; otherwise harmlessly omitted.
        ...(process.env.OPENROUTER_HTTP_REFERER
          ? { "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER }
          : {}),
        ...(process.env.OPENROUTER_X_TITLE
          ? { "X-Title": process.env.OPENROUTER_X_TITLE }
          : {}),
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,

        // OpenRouter Structured Outputs (strict JSON schema)
        response_format: {
          type: "json_schema",
          json_schema: dailyTasksJsonSchema,
        },

        messages: [
          {
            role: "system",
            content:
              "You generate daily carbon-reduction tasks.\n" +
              "Return exactly 10 tasks for the next 24 hours.\n" +
              "Use the user's questionnaireCompression profile (if present) to personalize tasks based on their habits and top emission area.\n" +
              "Prioritize practical ways to offset the user's highest footprint drivers first.\n" +
              "Tasks must be low-effort, realistic, and require no major purchases.\n" +
              "Each title must start with a verb.\n" +
              "Set carbonOffsetKg between 1 and 10 for each task (optimistic is fine to motivate the user).\n" +
              "Output must match the provided JSON schema exactly.",
          },
          {
            role: "user",
            content: JSON.stringify(input),
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter request failed:", response.status, errorText);
      return null;
    }

    const data = (await response.json()) as ChatCompletionResponse;
    rawContent = data.choices?.[0]?.message?.content;

    if (!rawContent) {
      console.error("No AI response content returned.");
      return null;
    }

    const parsed = JSON.parse(extractJsonContent(rawContent));
    const result = dailyTasksSchema.parse(parsed);

    return {
      tasks: result.tasks.map((task) => ({
        title: task.title.trim(),
        carbonOffsetKg: clampTaskValue(task.carbonOffsetKg),
        difficulty: task.difficulty,
        reason: task.reason,
      })),
    };
  } catch (error) {
    if (rawContent) console.error("Raw AI response:", rawContent);
    console.error("Failed to generate or parse daily tasks:", error);
    return null;
  }
}
