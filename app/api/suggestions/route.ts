import { generateSuggestions } from "../../../src/ai";
import { calculateFootprint, mapAnswersToFootprintInput } from "../../../src/footprint";
import { QUESTIONNAIRE_V1 } from "../../../src/questionnaire";
import { suggestionRequestSchema } from "../../../src/schema";
import { AnswerValidationError, validateAnswers } from "../../../src/validateAnswers";

export async function POST(request: Request): Promise<Response> {
  let jsonBody: unknown;
  try {
    jsonBody = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsedBody = suggestionRequestSchema.safeParse(jsonBody);
  if (!parsedBody.success) {
    return Response.json(
      { error: "Invalid request body.", details: parsedBody.error.flatten() },
      { status: 400 }
    );
  }

  const { questionnaireVersion, answers } = parsedBody.data;

  let validAnswers: ReturnType<typeof validateAnswers>["validAnswers"];
  let missingQuestionIds: string[];
  try {
    const validated = validateAnswers(QUESTIONNAIRE_V1, answers);
    validAnswers = validated.validAnswers;
    missingQuestionIds = validated.missingQuestionIds;
  } catch (error) {
    if (error instanceof AnswerValidationError) {
      return Response.json(
        { error: error.message, details: error.details },
        { status: 400 }
      );
    }
    return Response.json({ error: "Unexpected answer validation error." }, { status: 500 });
  }

  const { calculatorInput, assumptions } = mapAnswersToFootprintInput(validAnswers);
  const footprint = calculateFootprint(calculatorInput);

  const answeredQuestions = QUESTIONNAIRE_V1.questions
    .filter((question) => question.id in validAnswers)
    .map((question) => ({
      questionId: question.id,
      section: question.section,
      prompt: question.prompt,
      userAnswer: String(validAnswers[question.id])
    }));

  const suggestions = await generateSuggestions({
    questionnaireVersion,
    answeredQuestions,
    missingQuestionIds,
    assumptions,
    footprint
  });

  return Response.json({
    questionnaireVersion,
    footprint,
    assumptions,
    missingQuestionIds,
    suggestions,
    ...(suggestions ? {} : { aiError: true })
  });
}
