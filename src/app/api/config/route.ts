import { smsCredentials } from "@/lib/africastalking";

export const dynamic = "force-dynamic";

export function GET() {
  const { configured, username, sandbox, senderId } = smsCredentials();

  return Response.json({
    configured,
    username: username || null,
    sandbox,
    senderId: senderId || null,
  });
}
