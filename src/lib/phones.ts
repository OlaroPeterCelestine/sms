const E164 = /^\+[1-9]\d{6,14}$/;

export function parseRecipients(raw: string): string[] {
  const parts = raw
    .split(/[\s,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return [...new Set(parts)];
}

export function validateRecipients(numbers: string[]): string | null {
  if (numbers.length === 0) {
    return "Add at least one phone number.";
  }

  if (numbers.length > 100) {
    return "Send at most 100 numbers at a time.";
  }

  const invalid = numbers.filter((number) => !E164.test(number));
  if (invalid.length > 0) {
    return `Use international format, for example +254712345678. Invalid: ${invalid.join(", ")}`;
  }

  return null;
}
