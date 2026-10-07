import { NextResponse } from "next/server";
import "@/lib/firebaseAdmin"; // Ensures Firebase Admin is initialized
import * as admin from "firebase-admin";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "products";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Access default Firebase storage bucket
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET || "meister-6670d.firebasestorage.app";
    const bucket = admin.storage().bucket(bucketName);
    const fileExtension = file.name.split(".").pop();
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExtension}`;
    const fileRef = bucket.file(fileName);

    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type,
      },
    });

    // Make file public or obtain download URL
    await fileRef.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    return NextResponse.json({ url: publicUrl }, { status: 200 });
  } catch (error: any) {
    console.error("Firebase Storage Upload Error:", error);
    return NextResponse.json({ error: error.message || "Failed to upload file" }, { status: 500 });
  }
}