const REPLACEMENTS: Array<[RegExp, string]> = [
  [/Ã‚Â·/g, "\u00B7"],
  [/Â·/g, "\u00B7"],
  [/Ã—/g, "\u00D7"],
  [/Ã¢â‚¬â€/g, "\u2014"],
  [/â€”/g, "\u2014"],
  [/Ã¢â‚¬â€œ/g, "\u2013"],
  [/â€“/g, "\u2013"],
  [/Ã¢â‚¬Â¦/g, "\u2026"],
  [/â€¦/g, "\u2026"],
  [/Ã¢Å“â€œ/g, "\u2713"],
  [/âœ“/g, "\u2713"],
  [/Ã¢Å“â€°/g, "\u2709"],
  [/Ã¢â€ â€™/g, "\u2192"],
  [/â†’/g, "\u2192"],
  [/Ã¢â€ Â»/g, "\u21BB"],
  [/Ã¢â€šÂ¹/g, "\u20B9"],
  [/â‚¹/g, "\u20B9"],
  [/Ã¯Â¼â€¹/g, "\uFF0B"],
  [/ï¼‹/g, "\uFF0B"],
];

function looksMojibaked(value: string): boolean {
  return /[ÃÂâð]/.test(value);
}

function decodeLatin1Utf8Mojibake(value: string): string {
  try {
    const bytes = new Uint8Array(Array.from(value, (char) => char.charCodeAt(0) & 0xff));
    const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    return decoded && decoded.includes("\uFFFD") ? value : decoded;
  } catch {
    return value;
  }
}

export function sanitizeText(value: string): string {
  if (!value) return value;

  let next = value;

  if (looksMojibaked(next)) {
    const decoded = decodeLatin1Utf8Mojibake(next);
    if (decoded && decoded !== next) next = decoded;
  }

  for (const [pattern, replacement] of REPLACEMENTS) {
    next = next.replace(pattern, replacement);
  }

  return next
    .replace(/\s+\u00B7\s+/g, " \u00B7 ")
    .replace(/\s+\u2014\s+/g, " \u2014 ")
    .replace(/\u00A0/g, " ");
}

export function sanitizeDeep<T>(value: T): T {
  if (typeof value === "string") return sanitizeText(value) as T;
  if (Array.isArray(value)) return value.map((item) => sanitizeDeep(item)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, sanitizeDeep(item)]),
    ) as T;
  }
  return value;
}
