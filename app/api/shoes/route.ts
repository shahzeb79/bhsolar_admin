import { NextResponse } from "next/server";
import { db, clearCloudCache } from "@/lib/firebaseAdmin";

export async function GET() {
  try {
    // If you prefer to store shoes in the "products" collection alongside other items,
    // change "shoes" to "products" below.
    const snapshot = await db.collection("shoes").get();
    const shoes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    
    return NextResponse.json(shoes);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch shoes" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    let shoeId = (data.id || "").trim();

    // If no ID is provided, auto-generate one using shoe fields (gender, slug, or name)
    if (!shoeId) {
      const nameText = data.slug || data.name || "shoe";
      const category = data.gender || data.subCategory || "shoes";
      const slug = nameText
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+\$/g, "");

      let candidateId = slug ? `${category}_${slug}` : `${category}_${Date.now()}`;
      const existingDoc = await db.collection("shoes").doc(candidateId).get();

      if (existingDoc.exists) {
        candidateId = `${candidateId}_${Date.now() % 10000}`;
      }
      shoeId = candidateId;
    }

    // Delete `id` property from payload before saving doc content
    delete data.id;

    // Save/merge shoe document into Firestore
    await db.collection("shoes").doc(shoeId).set(data, { merge: true });

    // Clear cloud cache
    await clearCloudCache();

    return NextResponse.json({ status: "success", shoe_id: shoeId });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to save shoe" },
      { status: 500 }
    );
  }
}