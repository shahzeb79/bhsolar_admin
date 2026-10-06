import { NextResponse } from "next/server";
import { db, clearCloudCache } from "@/lib/firebaseAdmin";

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  await db.collection("error_knowledgebase").doc(params.id).delete();
  await clearCloudCache();
  return NextResponse.json({ status: "success" });
}