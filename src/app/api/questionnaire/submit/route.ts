import { NextResponse } from "next/server";
import admin from "firebase-admin";
import {
  calculateFootprint,
  mapAnswersToFootprintInput,
} from "../../../../footprint";
import { buildQuestionnaireCompressionV1 } from "../../../../questionnaireCompression";
import { QUESTIONNAIRE_V1 } from "../../../../questionnaire";
import {
  AnswerValidationError,
  validateAnswers,
} from "../../../../validateAnswers";

export const runtime = "nodejs";

function resolveServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;

  const unwrap = (value: string) => {
    const trimmed = value.trim();
    if ((trimmed.startsWith("'") && trimmed.endsWith("'")) ||
        (trimmed.startsWith("\"") && trimmed.endsWith("\""))) {
      return trimmed.slice(1, -1);
    }
    return trimmed;
  };

  const parseJson = (value: string) => {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed.private_key === "string") {
      parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    }
    return parsed;
  };

  const unwrapped = unwrap(raw);

  try {
    if (unwrapped.startsWith("{")) {
      return parseJson(unwrapped);
    }
  } catch {
    // ignore and try base64
  }

  try {
    const decoded = Buffer.from(unwrapped, "base64").toString("utf-8");
    return parseJson(decoded);
  } catch {
    return null;
  }
}

function getAdminApp() {
  if (!admin.apps.length) {
    const serviceAccount = resolveServiceAccount();
    const projectId =
      serviceAccount?.project_id ??
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
      process.env.FIREBASE_PROJECT_ID;
    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId
      });
    } else if (projectId) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId
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
  const roundedFootprintKg = Math.round(footprint.totalKgPerYear * 10) / 10;
  const questionnaireCompression = buildQuestionnaireCompressionV1({
    answers: validAnswers,
    initialFootprintKg: roundedFootprintKg,
    breakdown: footprint.breakdown,
  });

  const adminDb = getAdminDb();
  await adminDb
    .collection("users")
    .doc(decoded.uid)
    .set(
      {
        initialFootprintKg: roundedFootprintKg,
        questionnaireAnswers: validAnswers,
        questionnaireVersion: "v1",
        questionnaireCompression,
        updatedAt: getFieldValue().serverTimestamp(),
      },
      { merge: true },
    );

  return NextResponse.json({
    ok: true,
    initialFootprintKg: roundedFootprintKg,
    assumptions,
  });
}
