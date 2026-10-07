import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const {
      phoneNumbers,
      templateName,
      mediaUrl,
      languageCode = "en_US",
      bodyParameters = [], // Array of values for {{1}}, {{2}}, etc.
    } = await req.json();

    const targets: string[] = Array.isArray(phoneNumbers)
      ? phoneNumbers
      : phoneNumbers
      ? [phoneNumbers]
      : [];

    if (targets.length === 0) {
      return NextResponse.json(
        { error: "phoneNumbers field is required and must not be empty." },
        { status: 400 }
      );
    }

    const url = `https://graph.facebook.com/v25.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const token = process.env.WHATSAPP_ACCESS_TOKEN;

    // Build template components dynamically
    const components: any[] = [];

    // 1. Header Component (Image)
    if (mediaUrl) {
      components.push({
        type: "header",
        parameters: [{ type: "image", image: { link: mediaUrl } }],
      });
    }

    // 2. Body Component (Maps array to Meta's variable structure {{1}}, {{2}}, etc.)
    if (Array.isArray(bodyParameters) && bodyParameters.length > 0) {
      components.push({
        type: "body",
        parameters: bodyParameters.map((val: string) => ({
          type: "text",
          text: String(val),
        })),
      });
    }

    const results = [];

    for (const rawPhone of targets) {
      const phone = String(rawPhone).replace(/\D/g, "");

      const payload = {
        messaging_product: "whatsapp",
        to: phone,
        type: "template",
        template: {
          name: templateName,
          language: { code: languageCode },
          ...(components.length > 0 ? { components } : {}),
        },
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log("Meta API Response for", phone, ":", JSON.stringify(data, null, 2));
      results.push({ phone, status: response.ok ? "sent" : "failed", details: data });
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}