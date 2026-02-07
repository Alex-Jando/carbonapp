import { NextResponse } from "next/server";
import {
  calculateFootprint,
  mapAnswersToFootprintInput,
} from "../../../../footprint";
import { QUESTIONNAIRE_V1 } from "../../../../questionnaire";
import {
  AnswerValidationError,
  validateAnswers,
} from "../../../../validateAnswers";

type QuestionnaireSubmitBody = {
  questionnaireVersion: "v1";
  answers: Record<string, unknown>;
  localId: string;
};

export async function POST(request: Request) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    return NextResponse.json(
      { error: "Server is missing NEXT_PUBLIC_FIREBASE_PROJECT_ID." },
      { status: 500 },
    );
  }

  let jsonBody: QuestionnaireSubmitBody;
  try {
    jsonBody = (await request.json()) as QuestionnaireSubmitBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (jsonBody.questionnaireVersion !== "v1") {
    return NextResponse.json(
      { error: "Unsupported questionnaire version." },
      { status: 400 },
    );
  }

  const localId =
    typeof jsonBody.localId === "string" ? jsonBody.localId.trim() : "";
  if (!localId) {
    return NextResponse.json({ error: "Missing localId." }, { status: 400 });
  }

  let validAnswers: ReturnType<typeof validateAnswers>["validAnswers"];
  try {
    const validated = validateAnswers(QUESTIONNAIRE_V1, jsonBody.answers ?? {});
    validAnswers = validated.validAnswers;
  } catch (error) {
    if (error instanceof AnswerValidationError) {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Unexpected answer validation error." },
      { status: 500 },
    );
  }

  const { calculatorInput, assumptions } =
    mapAnswersToFootprintInput(validAnswers);
  const footprint = calculateFootprint(calculatorInput);

  const authHeader = request.headers.get("authorization") ?? "";
  const tokenMatch = authHeader.match(/^Bearer (.+)$/i);
  if (!tokenMatch) {
    return NextResponse.json(
      { error: "Missing Authorization Bearer token." },
      { status: 401 },
    );
  }

  const idToken = tokenMatch[1];
  const updateUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${localId}?updateMask.fieldPaths=initialFootprintKg`;
  const updateBody = {
    fields: {
      initialFootprintKg: {
        integerValue: Math.round(footprint.totalKgPerYear).toString(),
      },
    },
  };

  const firestoreRes = await fetch(updateUrl, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(updateBody),
  });

  if (!firestoreRes.ok) {
    const firestoreError = await firestoreRes.json().catch(() => ({}));
    return NextResponse.json(
      {
        error:
          firestoreError?.error?.message ??
          "Failed to update initialFootprintKg.",
      },
      { status: firestoreRes.status },
    );
  }

  return NextResponse.json({
    ok: true,
    initialFootprintKg: Math.round(footprint.totalKgPerYear),
    assumptions,
  });
}

