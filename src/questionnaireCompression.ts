import type { FootprintBreakdown } from "./footprint";
import { QUESTIONNAIRE_V1 } from "./questionnaire";
import type { ValidatedAnswers } from "./validateAnswers";

type AnswerToken = string | number;

type AnswerArea = "transport" | "home" | "diet" | "consumption" | "waste";

type AreaAnswers = Record<string, AnswerToken>;

type AnswersByArea = Record<AnswerArea, AreaAnswers>;

export type QuestionnaireCompressionV1 = {
  version: "v1";
  footprintKgPerYear: number;
  breakdownKgPerYear: {
    transport: number;
    home: number;
    diet: number;
  };
  topEmissionArea: "transport" | "home" | "diet";
  answersByArea: AnswersByArea;
  compactSummary: string;
};

const AREA_PREFIXES: Array<{ area: AnswerArea; prefix: string }> = [
  { area: "transport", prefix: "q_transport_" },
  { area: "home", prefix: "q_home_" },
  { area: "diet", prefix: "q_diet_" },
  { area: "consumption", prefix: "q_consumption_" },
  { area: "waste", prefix: "q_waste_" },
];

function emptyAnswersByArea(): AnswersByArea {
  return {
    transport: {},
    home: {},
    diet: {},
    consumption: {},
    waste: {},
  };
}

function toCompactStringToken(value: string): string {
  return value
    .replace(/\([^)]*\)/g, " ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
    .split("_")
    .slice(0, 8)
    .join("_");
}

function toAnswerToken(value: unknown): AnswerToken {
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "number") {
    const rounded = Math.round(value * 10) / 10;
    return Number.isFinite(rounded) ? rounded : 0;
  }
  if (typeof value === "string") {
    const token = toCompactStringToken(value);
    return token || "unknown";
  }
  return "unknown";
}

function toTopEmissionArea(
  breakdown: FootprintBreakdown,
): "transport" | "home" | "diet" {
  const ordered = [
    { area: "transport" as const, kg: breakdown.transportKg },
    { area: "home" as const, kg: breakdown.homeKg },
    { area: "diet" as const, kg: breakdown.dietKg },
  ].sort((a, b) => b.kg - a.kg);

  return ordered[0]?.area ?? "transport";
}

function formatAreaSummary(area: AnswerArea, answers: AreaAnswers): string {
  const entries = Object.entries(answers);
  if (entries.length === 0) return `${area}{}`;
  const joined = entries.map(([k, v]) => `${k}=${v}`).join(",");
  return `${area}{${joined}}`;
}

export function buildQuestionnaireCompressionV1(input: {
  answers: ValidatedAnswers;
  initialFootprintKg: number;
  breakdown: FootprintBreakdown;
}): QuestionnaireCompressionV1 {
  const answersByArea = emptyAnswersByArea();

  for (const question of QUESTIONNAIRE_V1.questions) {
    const raw = input.answers[question.id];
    if (raw === undefined) continue;

    for (const areaPrefix of AREA_PREFIXES) {
      if (!question.id.startsWith(areaPrefix.prefix)) continue;
      const key = question.id.slice(areaPrefix.prefix.length);
      answersByArea[areaPrefix.area][key] = toAnswerToken(raw);
      break;
    }
  }

  const topEmissionArea = toTopEmissionArea(input.breakdown);
  const compactSummary = [
    `fp=${Math.round(input.initialFootprintKg)}`,
    `top=${topEmissionArea}`,
    `br=transport:${Math.round(input.breakdown.transportKg)},home:${Math.round(input.breakdown.homeKg)},diet:${Math.round(input.breakdown.dietKg)}`,
    formatAreaSummary("transport", answersByArea.transport),
    formatAreaSummary("home", answersByArea.home),
    formatAreaSummary("diet", answersByArea.diet),
    formatAreaSummary("consumption", answersByArea.consumption),
    formatAreaSummary("waste", answersByArea.waste),
  ].join("|");

  return {
    version: "v1",
    footprintKgPerYear: Math.round(input.initialFootprintKg),
    breakdownKgPerYear: {
      transport: Math.round(input.breakdown.transportKg),
      home: Math.round(input.breakdown.homeKg),
      diet: Math.round(input.breakdown.dietKg),
    },
    topEmissionArea,
    answersByArea,
    compactSummary,
  };
}
