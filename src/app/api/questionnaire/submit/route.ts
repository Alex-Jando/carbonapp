import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { readFileSync } from "fs";
import {
  calculateFootprint,
  mapAnswersToFootprintInput,
} from "../../../../footprint";
import { QUESTIONNAIRE_V1 } from "../../../../questionnaire";
import {
  AnswerValidationError,
  validateAnswers,
} from "../../../../validateAnswers";

export const runtime = "nodejs";

function resolveServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) {
    return JSON.parse(trimmed);
  }
  try {
    const fileContent = readFileSync(trimmed, "utf-8");
    return JSON.parse(fileContent);
  } catch {
    return null;
  }
}

function getAdminApp() {
  if (!admin.apps.length) {
    const serviceAccount = resolveServiceAccount();
    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else {
      admin.initializeApp({
        credential: admin.credential.applicationDefault()
      });
    }
  }
  return admin.app();
}

function getAdminAuth() {
  return getAdminApp().auth();
}

function getAdminDb() {
  return getAdminApp().firestore();
}

function getFieldValue() {
  return admin.firestore.FieldValue;
}

type QuestionnaireSubmitBody = {
  questionnaireVersion: "v1";
  answers: Record<string, unknown>;
};

export async function POST(request: Request) {
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

  const authHeader = request.headers.get("authorization") ?? "";
  const tokenMatch = authHeader.match(/^Bearer (.+)$/i);
  if (!tokenMatch) {
    return NextResponse.json(
      { error: "Missing Authorization Bearer token." },
      { status: 401 },
    );
  }

  let decoded;
  try {
    decoded = await getAdminAuth().verifyIdToken(tokenMatch[1]);
  } catch {
    return NextResponse.json(
      { error: "Invalid or expired token." },
      { status: 401 },
    );
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

  const adminDb = getAdminDb();
  await adminDb.collection("users").doc(decoded.uid).set(
    {
      initialFootprintKg: Math.round(footprint.totalKgPerYear),
      updatedAt: getFieldValue().serverTimestamp()
    },
    { merge: true }
  );

  return NextResponse.json({
    ok: true,
    initialFootprintKg: Math.round(footprint.totalKgPerYear),
    assumptions,
  });
}
