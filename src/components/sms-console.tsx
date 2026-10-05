"use client";

import { useEffect, useMemo, useState } from "react";
import { parseRecipients, validateRecipients } from "@/lib/phones";
import { smsSegments } from "@/lib/segments";
import { recipientAccepted, type DeliveryReport, type InboundSms, type OutboundSms, type SmsRecipient } from "@/lib/store";

type Config = {
  configured: boolean;
  username: string | null;
  sandbox: boolean;
  senderId: string | null;
};

type Activity = {
  outbound: OutboundSms[];
  inbound: InboundSms[];
  deliveries: DeliveryReport[];
};

type Tab = "outbox" | "inbox" | "delivery";

const emptyActivity: Activity = { outbound: [], inbound: [], deliveries: [] };

export function SmsConsole({ origin }: { origin: string }) {
  const [config, setConfig] = useState<Config | null>(null);
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [senderId, setSenderId] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [activity, setActivity] = useState<Activity>(emptyActivity);
  const [tab, setTab] = useState<Tab>("outbox");

  const segments = useMemo(() => smsSegments(message), [message]);

  useEffect(() => {
    void fetch("/api/config")
      .then((response) => response.json())
      .then((data: Config) => {
        setConfig(data);
        if (data.senderId) setSenderId(data.senderId);
      })
      .catch(() => {
        setConfig({
          configured: false,
          username: null,
          sandbox: false,
          senderId: null,
        });
      });
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch("/api/activity", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as Activity;
        if (active) setActivity(data);
      } catch {
        // Keep the last snapshot if a poll fails.
      }
    }

    void load();
    const timer = window.setInterval(load, 4000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const recipientError = validateRecipients(parseRecipients(to));
    if (recipientError) {
      setNotice("");
      setError(recipientError);
      return;
    }

    if (!message.trim()) {
      setNotice("");
      setError("Write a message.");
      return;
    }

    setError("");
    setNotice("");
    setSending(true);

    try {
      const response = await fetch("/api/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to,
          message,
          senderId,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        summary?: string;
        recipients?: SmsRecipient[];
      };

      if (!response.ok) {
        setError(data.error || "Could not send the SMS.");
        setTab("outbox");
        const activityResponse = await fetch("/api/activity", { cache: "no-store" });
        if (activityResponse.ok) {
          setActivity((await activityResponse.json()) as Activity);
        }
        return;
      }

      const failed = (data.recipients ?? []).filter((recipient) => !recipientAccepted(recipient));
      setNotice(
        failed.length > 0
          ? data.summary || "Some numbers were rejected."
          : data.summary || "Message accepted.",
      );
      setTab("outbox");
      const activityResponse = await fetch("/api/activity", { cache: "no-store" });
      if (activityResponse.ok) {
        setActivity((await activityResponse.json()) as Activity);
      }
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSending(false);
    }
  }

  const environment = !config
    ? "Checking"
    : !config.configured
      ? "Not configured"
      : config.sandbox
        ? "Sandbox"
        : "Live";

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium tracking-[0.18em] text-moss uppercase">
            Africa&apos;s Talking
          </p>
          <h1 className="font-serif text-4xl tracking-tight text-ink sm:text-5xl">
            Send a text
          </h1>
        </div>
        <span className="w-fit rounded-full border border-line bg-card px-3 py-1 text-sm text-muted">
          {environment}
          {config?.username ? ` · ${config.username}` : ""}
        </span>
      </header>

      {config && !config.configured ? (
        <section className="rounded-2xl border border-line bg-card px-5 py-4 text-sm leading-6 text-ink">
          Copy <code className="font-mono">.env.example</code> to{" "}
          <code className="font-mono">.env.local</code>, add your API key, and restart{" "}
          <code className="font-mono">npm run dev</code>. Sandbox apps always use the username{" "}
          <code className="font-mono">sandbox</code>.
        </section>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <form
          onSubmit={onSubmit}
          className="rounded-3xl border border-line bg-card p-5 shadow-[0_18px_50px_-36px_rgba(28,25,21,0.7)] sm:p-6"
        >
          <label className="block text-sm font-medium" htmlFor="to">
            Recipients
          </label>
          <textarea
            id="to"
            name="to"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            rows={3}
            required
            placeholder="+254712345678"
            className="mt-2 w-full resize-y rounded-2xl border border-line bg-paper/60 px-3 py-3 text-base outline-none focus:border-moss"
          />
          <p className="mt-2 text-sm text-muted">
            International format. Separate extra numbers with commas or new lines.
          </p>

          <label className="mt-5 block text-sm font-medium" htmlFor="message">
            Message
          </label>
          <textarea
            id="message"
            name="message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={6}
            required
            maxLength={1600}
            placeholder="Your appointment is tomorrow at 9:00."
            className="mt-2 w-full resize-y rounded-2xl border border-line bg-paper/60 px-3 py-3 text-base outline-none focus:border-moss"
          />
          <p className="mt-2 text-right text-sm text-muted">
            {segments.length} / {segments.limit || 160} · {segments.segments || 0} SMS
            {segments.encoding === "unicode" ? " · Unicode" : ""}
          </p>

          <label className="mt-5 block text-sm font-medium" htmlFor="senderId">
            Sender ID
          </label>
          <input
            id="senderId"
            name="senderId"
            value={senderId}
            onChange={(event) => setSenderId(event.target.value)}
            maxLength={11}
            placeholder="Optional"
            className="mt-2 w-full rounded-2xl border border-line bg-paper/60 px-3 py-3 text-base outline-none focus:border-moss"
          />
          <p className="mt-2 text-sm text-muted">
            Registered short code or alphanumeric ID. Leave this blank in sandbox.
          </p>

          {error ? (
            <p className="mt-5 rounded-2xl bg-danger-soft px-3 py-3 text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p className="mt-5 rounded-2xl bg-moss-soft px-3 py-3 text-sm text-moss" role="status">
              {notice}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={sending || !config?.configured}
            className="mt-6 w-full rounded-full bg-clay px-5 py-3 text-base font-medium text-white transition hover:bg-clay-deep disabled:cursor-not-allowed disabled:bg-[#e4d5c8] disabled:text-[#8d6b58] disabled:hover:bg-[#e4d5c8]"
          >
            {sending ? "Sending…" : "Send SMS"}
          </button>
        </form>

        <section className="rounded-3xl border border-line bg-card p-5 sm:p-6">
          <div className="flex gap-2" role="tablist" aria-label="Message activity">
            {(
              [
                ["outbox", "Outbox", activity.outbound.length],
                ["inbox", "Inbox", activity.inbound.length],
                ["delivery", "Delivery", activity.deliveries.length],
              ] as const
            ).map(([id, label, count]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`rounded-full px-3 py-1.5 text-sm ${
                  tab === id ? "bg-ink text-card" : "bg-paper text-muted"
                }`}
              >
                {label}
                {count > 0 ? ` ${count}` : ""}
              </button>
            ))}
          </div>

          <div className="mt-4 max-h-[32rem] space-y-3 overflow-auto pr-1">
            {tab === "outbox" ? <Outbox items={activity.outbound} /> : null}
            {tab === "inbox" ? <Inbox items={activity.inbound} /> : null}
            {tab === "delivery" ? <Deliveries items={activity.deliveries} /> : null}
          </div>

          <dl className="mt-5 space-y-2 border-t border-line pt-4 text-xs leading-5 text-muted">
            <div>
              <dt className="font-medium text-ink">Incoming callback</dt>
              <dd className="break-all">{origin}/api/sms/incoming</dd>
            </div>
            <div>
              <dt className="font-medium text-ink">Delivery callback</dt>
              <dd className="break-all">{origin}/api/sms/delivery</dd>
            </div>
          </dl>
        </section>
      </div>
    </main>
  );
}

function Outbox({ items }: { items: OutboundSms[] }) {
  if (items.length === 0) {
    return <Empty text="Sent messages show up here." />;
  }

  return items.map((item) => (
    <article key={item.id} className="rounded-2xl border border-line px-3 py-3">
      <p className="text-sm leading-6 text-ink">{item.message}</p>
      <p className="mt-2 text-xs text-muted">
        {formatTime(item.at)}
        {item.senderId ? ` · ${item.senderId}` : ""}
      </p>
      <p className="mt-1 text-xs text-muted">{item.summary}</p>
      {item.recipients.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {item.recipients.map((recipient) => (
            <li key={`${item.id}-${recipient.number}-${recipient.messageId}`} className="flex items-start justify-between gap-3 text-sm">
              <span className="font-mono">{recipient.number}</span>
              <span className={recipientAccepted(recipient) ? "text-moss" : "text-danger"}>
                {recipient.status}
                {recipient.cost ? ` · ${recipient.cost}` : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  ));
}

function Inbox({ items }: { items: InboundSms[] }) {
  if (items.length === 0) {
    return <Empty text="Incoming texts appear after Africa's Talking posts to the callback." />;
  }

  return items.map((item) => (
    <article key={item.id} className="rounded-2xl border border-line px-3 py-3">
      <p className="text-sm leading-6">{item.text || "Empty message"}</p>
      <p className="mt-2 text-xs text-muted">
        {item.from || "Unknown"} → {item.to || "Unknown"} · {formatTime(item.at)}
      </p>
    </article>
  ));
}

function Deliveries({ items }: { items: DeliveryReport[] }) {
  if (items.length === 0) {
    return <Empty text="Delivery updates appear after you set the delivery URL." />;
  }

  return items.map((item) => (
    <article key={item.id} className="rounded-2xl border border-line px-3 py-3 text-sm">
      <p className="font-mono">{item.phoneNumber || "Unknown number"}</p>
      <p className="mt-1 text-ink">{item.status}</p>
      {item.failureReason ? <p className="mt-1 text-danger">{item.failureReason}</p> : null}
      <p className="mt-2 text-xs text-muted">{formatTime(item.at)}</p>
    </article>
  ));
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-2xl bg-paper px-3 py-8 text-center text-sm text-muted">{text}</p>;
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}
