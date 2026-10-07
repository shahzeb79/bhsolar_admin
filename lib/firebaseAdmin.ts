import * as admin from "firebase-admin";
import fs from "fs";
import path from "path";

if (!admin.apps.length) {
  try {
    const serviceAccountPath = path.join(process.cwd(), "sa.json");

    if (fs.existsSync(serviceAccountPath)) {
      // 1. Read serviceAccountKey.json from project root (Same as Flask)
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });
      console.log("🔥 Firebase Admin initialized using serviceAccountKey.json!");
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      // 2. Read from env variable
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("🔥 Firebase Admin initialized using ENV variable!");
    } else {
      // 3. Fallback to default credentials
      admin.initializeApp();
      console.log("🔥 Firebase Admin initialized using default credentials!");
    }
  } catch (error) {
    console.error("❌ Error initializing Firebase Admin:", error);
  }
}

export const db = admin.firestore();

export async function clearCloudCache(): Promise<boolean> {
  const url = "https://asia-south1-meister-6670d.cloudfunctions.net/webhook/admin/clear-cache";
  const secretKey = process.env.ADMIN_SECRET_KEY || "super_secret_admin_key";

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secretKey}`,
      },
    });
    return res.ok;
  } catch (error) {
    console.error("Error clearing cloud cache:", error);
    return false;
  }
}