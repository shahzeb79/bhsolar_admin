import { NextResponse } from "next/server";
import { db, clearCloudCache } from "@/lib/firebaseAdmin";

export async function GET() {
  const doc = await db.collection("bot_config").doc("net_metering").get();
  const data = doc.exists ? doc.data() : {};
  return NextResponse.json({
    content: data?.content || "☀️ *BHSolar Net Metering Guide*\n\nNet Metering allows you to sell excess electricity...",
  });
}

export async function POST(req: Request) {
  const { content } = await req.json();
  await db.collection("bot_config").doc("net_metering").set({ content: (content || "").trim() }, { merge: true });
  await clearCloudCache();
  return NextResponse.json({ status: "success" });
}