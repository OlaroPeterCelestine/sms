import { readPayload } from "@/lib/payload";
import { rememberInbound } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const payload = await readPayload(request);

  rememberInbound({
    id: payload.id || crypto.randomUUID(),
    at: payload.date || new Date().toISOString(),
    from: payload.from || "",
    to: payload.to || "",
    text: payload.text || payload.message || "",
    linkId: payload.linkId || "",
  });

  return new Response("OK", { status: 200 });
}
