import admin from "firebase-admin";

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

if (!admin.apps.length) {
  if (serviceAccountJson) {
    const credential = admin.credential.cert(JSON.parse(serviceAccountJson));
    admin.initializeApp({
      credential,
      ...(storageBucket ? { storageBucket } : {})
    });
  } else {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      ...(storageBucket ? { storageBucket } : {})
    });
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
export const adminFieldValue = admin.firestore.FieldValue;
