import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { readFileSync } from "fs";
import { generateDailyTasks } from "../../../ai";

export const runtime = "nodejs";

type DailyTaskDoc = {
  title: string;
  carbonOffsetKg: number;
  difficulty?: "easy" | "medium" | "hard";
  reason?: string;
  dateKey: string;
  createdAt: FirebaseFirestore.FieldValue;
};

function getTorontoDateKey(date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(date);
}

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

function getBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization") ?? "";
  const match = authHeader.match(/^Bearer (.+)$/i);
  return match ? match[1] : null;
}

async function deleteExistingDailyTasks(userRef: FirebaseFirestore.DocumentReference) {
  const snapshot = await userRef.collection("dailyTasks").get();
  if (snapshot.empty) return;

  const batch = getAdminDb().batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

export async function GET(request: Request) {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: "Missing Authorization Bearer token." }, { status: 401 });
  }

  let decoded;
  try {
    decoded = await getAdminAuth().verifyIdToken(token);
  } catch {
    return NextResponse.json({ error: "Invalid or expired token." }, { status: 401 });
  }

  const uid = decoded.uid;
  const dateKey = getTorontoDateKey();

  const adminDb = getAdminDb();
  const userRef = adminDb.collection("users").doc(uid);
  const userSnap = await userRef.get();
  const userData = userSnap.exists ? userSnap.data() ?? {} : {};

  const dailyTasksMeta = userData.dailyTasksMeta ?? null;
  const metaDateKey = dailyTasksMeta?.dateKey ?? null;

  if (metaDateKey === dateKey) {
    const tasksSnap = await userRef
      .collection("dailyTasks")
      .where("dateKey", "==", dateKey)
      .orderBy("createdAt", "asc")
      .get();

    const tasks = tasksSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({ dateKey, tasks }, { status: 200 });
  }

  const generated = await generateDailyTasks({
    dateKey,
    userProfile: {
      username: userData.username,
      email: userData.email,
      city: userData.city,
      initialFootprintKg: userData.initialFootprintKg ?? null,
      carbonOffsetKgTotal: userData.carbonOffsetKgTotal ?? 0
    }
  });

  if (!generated) {
    return NextResponse.json({ error: "Failed to generate daily tasks." }, { status: 500 });
  }

  await deleteExistingDailyTasks(userRef);

  const batch = adminDb.batch();
  const createdAt = getFieldValue().serverTimestamp();
  const tasks: Array<{ id: string } & DailyTaskDoc> = [];

  for (const task of generated.tasks) {
    const docRef = userRef.collection("dailyTasks").doc();
    const payload: DailyTaskDoc = {
      title: task.title,
      carbonOffsetKg: task.carbonOffsetKg,
      difficulty: task.difficulty,
      reason: task.reason,
      dateKey,
    createdAt
  };
  batch.set(docRef, payload);
  tasks.push({ id: docRef.id, ...payload });
}

  const userUpdate = {
    username: userData.username ?? "",
    email: userData.email ?? decoded.email ?? "",
    city: userData.city ?? "",
    initialFootprintKg: userData.initialFootprintKg ?? null,
    carbonOffsetKgTotal: userData.carbonOffsetKgTotal ?? 0,
    dailyTasksMeta: {
      dateKey,
      generatedAt: getFieldValue().serverTimestamp()
    },
    updatedAt: getFieldValue().serverTimestamp()
  };

  batch.set(userRef, userUpdate, { merge: true });
  await batch.commit();

  return NextResponse.json({ dateKey, tasks }, { status: 200 });
}
