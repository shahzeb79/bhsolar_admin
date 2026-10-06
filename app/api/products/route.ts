import { NextResponse } from "next/server";
import { db, clearCloudCache } from "@/lib/firebaseAdmin";

export async function GET() {
  const snapshot = await db.collection("products").get();
  const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  return NextResponse.json(products);
}

export async function POST(req: Request) {
  const data = await req.json();
  let prodId = (data.id || "").trim();

  if (!prodId) {
    const titleText = data.title || data.title_en || "item";
    const category = data.category || "ongrid";
    const slug = titleText.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    
    let candidateId = slug ? `${category}_${slug}` : `${category}_${Date.now()}`;
    const existingDoc = await db.collection("products").doc(candidateId).get();
    
    if (existingDoc.exists) {
      candidateId = `${candidateId}_${Date.now() % 10000}`;
    }
    prodId = candidateId;
  }

  delete data.id;
  await db.collection("products").doc(prodId).set(data, { merge: true });
  await clearCloudCache();

  return NextResponse.json({ status: "success", product_id: prodId });
}