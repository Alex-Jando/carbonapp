import type { QuestionDef, QuestionnaireDef } from "./questionnaire";

export type AnswerValue = boolean | number | string;

export type ValidatedAnswers = Record<string, AnswerValue>;

export type ValidateAnswersResult = {
  validAnswers: ValidatedAnswers;
  missingQuestionIds: string[];
};

export class AnswerValidationError extends Error {
  readonly details: string[];

  constructor(message: string, details: string[]) {
    super(message);
    this.name = "AnswerValidationError";
    this.details = details;
  }
}

function validateAnswerValue(question: QuestionDef, value: unknown): value is AnswerValue {
  if (question.type === "boolean") {
    return typeof value === "boolean";
  }

  if (question.type === "number") {
    return typeof value === "number" && Number.isFinite(value) && value >= 0;
  }

  if (question.type === "single") {
    return typeof value === "string" && Array.isArray(question.options) && question.options.includes(value);
  }

  return false;
}

export function validateAnswers(
  questionnaire: QuestionnaireDef,
  answers: Record<string, unknown>
): ValidateAnswersResult {
  const questionById = new Map(questionnaire.questions.map((question) => [question.id, question]));
  const errors: string[] = [];
  const validAnswers: ValidatedAnswers = {};

  for (const [answerId, value] of Object.entries(answers)) {
    const question = questionById.get(answerId);
    if (!question) {
      errors.push(`Unknown questionId: ${answerId}`);
      continue;
    }

    if (!validateAnswerValue(question, value)) {
      errors.push(`Invalid answer for questionId: ${answerId}`);
      continue;
    }

    validAnswers[answerId] = value;
  }

  if (errors.length > 0) {
    throw new AnswerValidationError("Answer validation failed.", errors);
  }

  const missingQuestionIds = questionnaire.questions
    .map((question) => question.id)
    .filter((questionId) => !(questionId in validAnswers));

  return { validAnswers, missingQuestionIds };
}
