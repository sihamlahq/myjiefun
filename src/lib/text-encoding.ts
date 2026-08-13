/** Detect CJK Unified Ideographs and common extension blocks. */
export function hasCjk(text: string) {
  return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(text);
}

function countChars(text: string, pattern: RegExp) {
  return (text.match(pattern) ?? []).length;
}

function scoreDecodedText(text: string) {
  const replacement = countChars(text, /\uFFFD/g);
  const cjk = countChars(text, /[\u3400-\u9fff]/g);
  const weird = countChars(text, /[\u0080-\u009f]/g);
  // Lower is better for replacement/weird; higher CJK is better.
  return replacement * 1000 + weird * 10 - cjk;
}

function decodeWith(label: string, bytes: Uint8Array) {
  try {
    return new TextDecoder(label, { fatal: false }).decode(bytes);
  } catch {
    return null;
  }
}

/**
 * Decode guest CSV bytes. Chinese Excel often saves CSV as GBK/GB18030,
 * while `file.text()` always assumes UTF-8 and turns 中文 into �.
 */
export function decodeImportBytes(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  if (!bytes.length) return "";

  // BOM shortcuts
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(bytes.subarray(3));
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes.subarray(2));
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(bytes.subarray(2));
  }

  const encodings = ["utf-8", "gb18030", "gbk", "big5"] as const;
  const candidates = encodings
    .map((encoding) => decodeWith(encoding, bytes))
    .filter((text): text is string => text != null);

  if (!candidates.length) {
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  }

  candidates.sort((a, b) => scoreDecodedText(a) - scoreDecodedText(b));
  return candidates[0]!;
}

function bytesFromLatin1(text: string): Uint8Array | null {
  const bytes = new Uint8Array(text.length);
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code > 255) return null;
    bytes[index] = code;
  }
  return bytes;
}

/**
 * Fix common mojibake where Chinese bytes were stored as Latin-1/Windows-1252 text.
 * Cannot recover characters already permanently replaced with � — re-import those.
 */
export function repairMojibakeText(value: string | null | undefined): string {
  const text = value ?? "";
  if (!text || hasCjk(text)) return text;
  if (!/[À-ÿ\u0080-\u00ff]/.test(text) && !text.includes("\uFFFD")) return text;

  const bytes = bytesFromLatin1(text);
  if (!bytes) return text;

  const repaired = ["utf-8", "gb18030", "gbk", "big5"]
    .map((encoding) => decodeWith(encoding, bytes))
    .filter((candidate): candidate is string => Boolean(candidate && !candidate.includes("\uFFFD")))
    .sort((a, b) => scoreDecodedText(a) - scoreDecodedText(b));

  const best = repaired[0];
  if (best && hasCjk(best) && scoreDecodedText(best) < scoreDecodedText(text)) {
    return best;
  }
  return text;
}

export function repairGuestNameFields<T extends { name_en?: string; name_zh?: string; nickname?: string }>(
  guest: T,
): T {
  return {
    ...guest,
    ...(guest.name_en != null ? { name_en: repairMojibakeText(guest.name_en) } : null),
    ...(guest.name_zh != null ? { name_zh: repairMojibakeText(guest.name_zh) } : null),
    ...(guest.nickname != null ? { nickname: repairMojibakeText(guest.nickname) } : null),
  };
}
