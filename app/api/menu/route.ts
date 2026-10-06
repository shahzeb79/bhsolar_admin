import { NextResponse } from "next/server";
import { db, clearCloudCache } from "@/lib/firebaseAdmin";

export async function GET() {
  const doc = await db.collection("bot_config").doc("main_menu").get();
  const raw = doc.exists ? doc.data() : {};
  const data = raw?.en || raw || {};

  return NextResponse.json({
    body: data.body || "⚡ *Welcome to BHSolar Helpline*\n\nPlease select an option from the menu below:",
    button: data.button || "Explore Services",
    rows: data.rows || [],
  });
}

export async function POST(req: Request) {
  const data = await req.json();
  const rows = (data.rows || []).filter((r: any) => String(r.id || "").trim() !== "").map((r: any) => ({
    id: String(r.id).trim(),
    title: r.title || "",
    description: r.description || "",
  }));

  const payload = {
    body: data.body || "",
    button: data.button || "",
    rows,
  };

  await db.collection("bot_config").doc("main_menu").set(payload);
  await clearCloudCache();
  return NextResponse.json({ status: "success" });
}