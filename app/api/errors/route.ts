import { NextResponse } from "next/server";
import { db, clearCloudCache } from "@/lib/firebaseAdmin";

export async function GET() {
  const snapshot = await db.collection("error_knowledgebase").get();
  const errors = snapshot.docs.map(doc => ({ doc_id: doc.id, ...doc.data() }));
  return NextResponse.json(errors);
}

export async function POST(req: Request) {
  const data = await req.json();
  let docId = (data.doc_id || "").trim();

  const category = (data.category || "inverter").toLowerCase();
  const brand = (data.brand || "").trim();
  const errorCode = (data.error_code || "").trim().toUpperCase();

  if (!docId) {
    const slugBrand = brand.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    const slugCode = errorCode.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    docId = `${category}_${slugBrand}_${slugCode}`;
  }

  const payload = {
    brand,
    category,
    error_code: errorCode,
    title: (data.title || "").trim(),
    solution_text: (data.solution_text || "").trim(),
    video_url: (data.video_url || "").trim(),
  };

  await db.collection("error_knowledgebase").doc(docId).set(payload, { merge: true });
  await clearCloudCache();
  return NextResponse.json({ status: "success", doc_id: docId });
}