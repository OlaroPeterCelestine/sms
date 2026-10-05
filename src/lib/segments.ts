const GSM_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM_EXTENDED = new Set(["^", "{", "}", "\\", "[", "~", "]", "|", "€"]);

export type SmsEncoding = "gsm" | "unicode";

export function smsSegments(message: string): {
  encoding: SmsEncoding;
  length: number;
  segments: number;
  limit: number;
} {
  let septets = 0;

  for (const character of message) {
    if (GSM_BASIC.includes(character)) {
      septets += 1;
    } else if (GSM_EXTENDED.has(character)) {
      septets += 2;
    } else {
      const length = [...message].length;
      const limit = length <= 70 ? 70 : 67;
      return {
        encoding: "unicode",
        length,
        segments: length === 0 ? 0 : Math.ceil(length / limit),
        limit,
      };
    }
  }

  const limit = septets <= 160 ? 160 : 153;
  return {
    encoding: "gsm",
    length: septets,
    segments: septets === 0 ? 0 : Math.ceil(septets / limit),
    limit,
  };
}
