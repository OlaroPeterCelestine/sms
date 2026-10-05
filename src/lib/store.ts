export type SmsRecipient = {
  number: string;
  status: string;
  statusCode: number | null;
  cost: string;
  messageId: string;
};

export type OutboundSms = {
  id: string;
  at: string;
  message: string;
  summary: string;
  senderId: string | null;
  recipients: SmsRecipient[];
};

export type InboundSms = {
  id: string;
  at: string;
  from: string;
  to: string;
  text: string;
  linkId: string;
};

export type DeliveryReport = {
  id: string;
  at: string;
  messageId: string;
  phoneNumber: string;
  status: string;
  networkCode: string;
  failureReason: string;
};

type SmsStore = {
  outbound: OutboundSms[];
  inbound: InboundSms[];
  deliveries: DeliveryReport[];
};

const LIMIT = 50;

const globalStore = globalThis as typeof globalThis & {
  __smsStore?: SmsStore;
};

function store(): SmsStore {
  if (!globalStore.__smsStore) {
    globalStore.__smsStore = { outbound: [], inbound: [], deliveries: [] };
  }
  return globalStore.__smsStore;
}

function push<T>(list: T[], item: T) {
  list.unshift(item);
  if (list.length > LIMIT) list.length = LIMIT;
}

export function rememberOutbound(item: OutboundSms) {
  push(store().outbound, item);
}

export function rememberInbound(item: InboundSms) {
  push(store().inbound, item);
}

export function rememberDelivery(item: DeliveryReport) {
  push(store().deliveries, item);
}

export function listActivity() {
  const current = store();
  return {
    outbound: current.outbound,
    inbound: current.inbound,
    deliveries: current.deliveries,
  };
}

export function normalizeSendResult(data: unknown): {
  summary: string;
  recipients: SmsRecipient[];
} {
  const block = (data as { SMSMessageData?: { Message?: string; Recipients?: unknown[] } })
    ?.SMSMessageData;
  const recipients = Array.isArray(block?.Recipients) ? block.Recipients : [];

  return {
    summary: block?.Message?.trim() || "Request accepted.",
    recipients: recipients.map((item) => {
      const row = item as Record<string, unknown>;
      return {
        number: String(row.number ?? ""),
        status: String(row.status ?? "Unknown"),
        statusCode: typeof row.statusCode === "number" ? row.statusCode : null,
        cost: String(row.cost ?? ""),
        messageId: String(row.messageId ?? ""),
      };
    }),
  };
}

export function recipientAccepted(recipient: SmsRecipient) {
  if (recipient.statusCode === 100 || recipient.statusCode === 101 || recipient.statusCode === 102) {
    return true;
  }
  return /success|sent|queued|processed/i.test(recipient.status);
}
