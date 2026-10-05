import { headers } from "next/headers";
import { SmsConsole } from "@/components/sms-console";

export default async function Home() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? "http";

  return <SmsConsole origin={`${proto}://${host}`} />;
}
