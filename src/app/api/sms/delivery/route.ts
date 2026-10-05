import { readPayload } from "@/lib/payload";
import { rememberDelivery } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const payload = await readPayload(request);

  rememberDelivery({
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    messageId: payload.id || "",
    phoneNumber: payload.phoneNumber || payload.phone || "",
    status: payload.status || "Unknown",
    networkCode: payload.networkCode || "",
    failureReason: payload.failureReason || "",
  });

  return new Response("OK", { status: 200 });
}
