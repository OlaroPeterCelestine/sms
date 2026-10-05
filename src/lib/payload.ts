export async function readPayload(request: Request): Promise<Record<string, string>> {
  const type = request.headers.get("content-type") ?? "";

  if (type.includes("application/json")) {
    const json: unknown = await request.json();
    return flatten(json);
  }

  const form = await request.formData();
  const payload: Record<string, string> = {};
  form.forEach((value, key) => {
    if (typeof value === "string") payload[key] = value;
  });
  return payload;
}

function flatten(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") return {};

  const payload: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry == null) continue;
    payload[key] = typeof entry === "string" ? entry : String(entry);
  }
  return payload;
}

export function describeAtError(error: unknown): string {
  if (error && typeof error === "object" && "response" in error) {
    const response = (
      error as { response?: { status?: number; data?: unknown } }
    ).response;
    const data = response?.data;

    if (typeof data === "string" && data.trim()) return data.trim();

    if (data && typeof data === "object") {
      const message = (
        data as { SMSMessageData?: { Message?: string } }
      ).SMSMessageData?.Message;
      if (message?.trim()) return message.trim();
    }

    if (response?.status === 401) {
      return "Africa's Talking rejected the API key.";
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.replace(/;\s*$/, "").trim();
  }

  return "Could not send the SMS.";
}
