import AfricasTalking, {
  type AfricasTalkingClient,
} from "africastalking";

type Cache = {
  key: string;
  client: AfricasTalkingClient;
};

const globalCache = globalThis as typeof globalThis & {
  __atClient?: Cache;
};

export function smsCredentials() {
  const apiKey = process.env.AT_API_KEY?.trim() ?? "";
  const username = process.env.AT_USERNAME?.trim() ?? "";
  const senderId = process.env.AT_SENDER_ID?.trim() ?? "";

  return {
    apiKey,
    username,
    senderId,
    configured: Boolean(apiKey && username),
    sandbox: username.toLowerCase() === "sandbox",
  };
}

export function getSmsClient() {
  const { apiKey, username, configured } = smsCredentials();

  if (!configured) {
    throw new Error(
      "Set AT_API_KEY and AT_USERNAME in .env.local, then restart the dev server.",
    );
  }

  const key = `${username}:${apiKey}`;
  if (globalCache.__atClient?.key === key) {
    return globalCache.__atClient.client;
  }

  const client = AfricasTalking({ apiKey, username });
  globalCache.__atClient = { key, client };
  return client;
}
