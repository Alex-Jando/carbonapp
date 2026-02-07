import { dailyTasksSchema, suggestionSchema, type DailyTasksResponse, type SuggestionResponse } from "./schema";
import type { FootprintResult } from "./footprint";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-pro-1.5";

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

type SuggestionInput = {
  questionnaireVersion: string;
  answeredQuestions: Array<{
    questionId: string;
    section: string;
    prompt: string;
    userAnswer: string;
  }>;
  missingQuestionIds: string[];
  footprint: FootprintResult;
  assumptions: string[];
};

function extractJsonContent(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("```")) {
    return trimmed
      .replace(/^```[a-zA-Z]*\s*/, "")
      .replace(/\s*```$/, "")
      .trim();
  }
  return trimmed;
}

export async function generateSuggestions(input: SuggestionInput): Promise<SuggestionResponse | null> {
  const apiKey = process.env.OPENROUTER_API_KEY ?? process.env.OPENROUTER_APIKEY;
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
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: [
              "You are a carbon footprint advisor.",
              "Output STRICT JSON only.",
              "No markdown.",
              "No commentary.",
              "Reference the user's actual answers and question prompts in your reasoning.",
              "If key data is missing, call that out in summary or actions.",
              "Return only simple day-to-day actions the user can realistically do this week.",
              "Prefer low-effort habits over major purchases or complex upgrades.",
              "Use plain language and concrete tasks (for example: drive less one day, meatless day, cold-water laundry, reusable bottle).",
              "Each title must be a short actionable task starting with a verb.",
              "Keep reasons practical and easy to understand.",
              "JSON schema:",
              "{",
              '  "summary": "string",',
              '  "top_actions": [',
              "    {",
              '      "title": "string",',
              '      "estimated_reduction_kg_per_year": 0,',
              '      "difficulty": "easy|medium|hard",',
              '      "reason": "string"',
              "    }",
              "  ]",
              "}"
            ].join("\n")
          },
          {
            role: "user",
            content: JSON.stringify({
              questionnaireVersion: input.questionnaireVersion,
              answeredQuestions: input.answeredQuestions,
              missingQuestionIds: input.missingQuestionIds.slice(0, 20),
              assumptions: input.assumptions,
              footprint: {
                totalKgPerYear: input.footprint.totalKgPerYear,
                breakdown: input.footprint.breakdown
              }
            })
          }
        ]
      })
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
    return suggestionSchema.parse(parsed);
  } catch (error) {
    if (rawContent) {
      console.error("Raw AI response:", rawContent);
    }
    console.error("Failed to generate or parse AI suggestions:", error);
    return null;
  }
}

type DailyTaskInput = {
  dateKey: string;
  userProfile: {
    username?: string;
    email?: string;
    city?: string;
    initialFootprintKg?: number | null;
    carbonOffsetKgTotal?: number | null;
  };
  context?: {
    topActions?: SuggestionResponse["top_actions"];
  };
};

function clampTaskValue(value: number, min = 0, max = 50): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

export async function generateDailyTasks(input: DailyTaskInput): Promise<DailyTasksResponse | null> {
  const apiKey = process.env.OPENROUTER_API_KEY ?? process.env.OPENROUTER_APIKEY;
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
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: [
              "You generate daily carbon-reduction tasks.",
              "Output STRICT JSON only. No markdown. No commentary.",
              "Return exactly 10 tasks.",
              "Tasks must be low-effort and realistic for the next 24 hours.",
              "No major purchases or big lifestyle changes.",
              "Each task title must start with a verb.",
              "Each task must include: title, carbonOffsetKg, difficulty, reason.",
              "JSON schema:",
              "{",
              '  "tasks": [',
              "    {",
              '      "title": "string",',
              '      "carbonOffsetKg": 0,',
              '      "difficulty": "easy|medium|hard",',
              '      "reason": "string"',
              "    }",
              "  ]",
              "}"
            ].join("\n")
          },
          {
            role: "user",
            content: JSON.stringify(input)
          }
        ]
      })
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
        reason: task.reason
      }))
    };
  } catch (error) {
    if (rawContent) {
      console.error("Raw AI response:", rawContent);
    }
    console.error("Failed to generate or parse daily tasks:", error);
    return null;
  }
}
