import { getSmsClient, smsCredentials } from "@/lib/africastalking";
import { describeAtError } from "@/lib/payload";
import { parseRecipients, validateRecipients } from "@/lib/phones";
import {
  normalizeSendResult,
  rememberOutbound,
  type SmsRecipient,
} from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SENDER_ID = /^[A-Za-z0-9]{1,11}$/;

export async function POST(request: Request) {
  const credentials = smsCredentials();
  if (!credentials.configured) {
    return Response.json(
      {
        error:
          "Set AT_API_KEY and AT_USERNAME, then redeploy.",
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send a JSON body." }, { status: 400 });
  }

  const input = body as { to?: unknown; message?: unknown; senderId?: unknown };
  const rawRecipients = Array.isArray(input.to)
    ? input.to.map((value) => String(value)).join(",")
    : String(input.to ?? "");
  const recipients = parseRecipients(rawRecipients);
  const recipientError = validateRecipients(recipients);
  if (recipientError) {
    return Response.json({ error: recipientError }, { status: 400 });
  }

  const message = String(input.message ?? "").trim();
  if (!message) {
    return Response.json({ error: "Write a message." }, { status: 400 });
  }
  if ([...message].length > 1600) {
    return Response.json(
      { error: "Keep the message under 1,600 characters." },
      { status: 400 },
    );
  }

  const requestedSender = String(input.senderId ?? "").trim();
  const senderId = requestedSender || credentials.senderId;
  if (senderId && !SENDER_ID.test(senderId)) {
    return Response.json(
      { error: "Sender ID must be 1–11 letters or numbers." },
      { status: 400 },
    );
  }

  try {
    const result = await getSmsClient().SMS.send({
      to: recipients,
      message,
      ...(senderId ? { from: senderId } : {}),
    });
    const normalized = normalizeSendResult(result);

    rememberOutbound({
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      message,
      summary: normalized.summary,
      senderId: senderId || null,
      recipients: normalized.recipients,
    });

    return Response.json(normalized);
  } catch (error) {
    const empty: SmsRecipient[] = [];
    rememberOutbound({
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      message,
      summary: describeAtError(error),
      senderId: senderId || null,
      recipients: empty,
    });

    return Response.json({ error: describeAtError(error) }, { status: 502 });
  }
}
