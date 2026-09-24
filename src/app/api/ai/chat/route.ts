import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { message, images, model, provider } = body as {
    message: string;
    images?: string[];
    model?: string;
    provider?: string;
  };

  // Auth check
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (!data?.user) {
      // Allow demo mode without auth for local dev
      if (process.env.TEMPO_DEMO_MODE !== "true") {
        // Still allow mock response without auth for now
      }
    }
  } catch {
    // ignore
  }

  if (!message && (!images || images.length === 0)) {
    return NextResponse.json({ error: { message: "Message or image required" } }, { status: 400 });
  }

  // If images provided but model is not vision-capable, return hint
  const isVisionModel = (m: string) => {
    const s = (m || "").toLowerCase();
    return s.includes("vision") || s.includes("gpt-4o") || s.includes("llava");
  };
  if (images?.length && !isVisionModel(model || "")) {
    return NextResponse.json({
      reply: `Vision model required for images. You sent ${images.length} image(s) but model "${model}" is not vision-capable. Switch to e.g., llama-3.2-11b-vision-preview in Settings → AI.`,
    });
  }

  // Try Groq if key is set on server
  const groqKey = process.env.GROQ_API_KEY || process.env.AI_API_KEY;
  if (groqKey && provider !== "custom") {
    try {
      const groqModel = model || "llama-3.1-8b-instant";
      const messages: any[] = [];
      if (images?.length) {
        // Vision format: content as array with text and image_url
        messages.push({
          role: "user",
          content: [
            { type: "text", text: message || "Describe this image and create a calendar event if it contains a schedule." },
            ...images.map((b64) => ({ type: "image_url", image_url: { url: b64 } })),
          ],
        });
      } else {
        messages.push({ role: "user", content: message });
      }

      const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: groqModel,
          messages: [
            { role: "system", content: "You are Tempo AI, a helpful calendar assistant. You can create events, calendars and manage reminders. Keep replies concise." },
            ...messages,
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });
      const data: any = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        return NextResponse.json({ reply: `Groq error: ${data?.error?.message || resp.statusText}. Mock fallback: I would help with "${message?.slice(0, 80)}".` });
      }
      const reply = data?.choices?.[0]?.message?.content || "No reply";
      return NextResponse.json({ reply });
    } catch (e) {
      return NextResponse.json({ reply: `Server error: ${String((e as Error).message)}. Mock: I would help with "${message?.slice(0, 60)}".` });
    }
  }

  // Mock fallback when no server key (user can still demo with client-side key prefix+key stored locally, but server proxy prefers env)
  const mockHint = images?.length
    ? `Mock vision: Received ${images.length} image(s) + "${message?.slice(0, 60)}". Set GROQ_API_KEY in .env for real vision (e.g., llama-3.2-11b-vision-preview).`
    : `Mock: I would ${message.toLowerCase().includes("create") ? "create an event" : "help"} for "${message.slice(0, 80)}". Set GROQ_API_KEY in .env for live Groq.`;
  return NextResponse.json({ reply: mockHint });
}
