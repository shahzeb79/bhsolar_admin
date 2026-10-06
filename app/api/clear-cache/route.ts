import { NextResponse } from "next/server";
import { clearCloudCache } from "@/lib/firebaseAdmin";

export async function POST() {
  const success = await clearCloudCache();
  if (success) {
    return NextResponse.json({ message: "⚡ WhatsApp Cloud Cache Invalidated Successfully!" });
  }
  return NextResponse.json({ message: "⚠ Failed to trigger Cloud Function cache clear." }, { status: 500 });
}