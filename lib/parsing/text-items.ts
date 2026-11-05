// Rules-first item parser (ONB-11, ONB-14). Handles the formats vendors actually
// type, one item per line or comma-separated pairs. Anything ambiguous asks one
// question instead of guessing.

export type ParsedItem = {
  name: string;
  pricePesewas: number;
  stock: number | null;
};

export type ParseResult =
  | { ok: true; items: ParsedItem[] }
  | { ok: false; reason: 'empty' | 'no-price' | 'ambiguous' | 'too-long'; hint?: string };

const MAX_NAME = 80;
const MAX_PRICE_PESEWAS = 10_000_000; // GH₵100,000

function toPesewas(raw: string): number {
  const cleaned = raw.replace(/,/g, '.');
  return Math.round(Number(cleaned) * 100);
}

function tidyName(raw: string): string {
  return raw
    .replace(/\b(?:ghs|ghc|gh₵|₵|cedis?)\b/gi, ' ')
    .replace(/[,\-–—:;]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_NAME);
}

function extractStock(segment: string): { rest: string; stock: number | null } {
  const match = segment.match(/\b(?:only\s*)?(\d{1,5})\s*(?:left|in stock|remaining)\b/i);
  if (!match) return { rest: segment, stock: null };
  return {
    rest: segment.replace(match[0], ' ').replace(/\s+/g, ' ').trim(),
    stock: Number(match[1]),
  };
}

function parseSegment(raw: string): ParsedItem | null {
  const { rest, stock } = extractStock(raw);
  const tokens = [...rest.matchAll(/(?:ghs|ghc|gh₵|₵)?\s*(\d+(?:[.,]\d{1,2})?)\s*(?:cedis|ghs|ghc|gh₵|₵)?/gi)];
  if (!tokens.length) return null;

  // The price is the last number in the segment; anything after it is noise.
  const priceToken = tokens[tokens.length - 1];
  const priceText = priceToken[1];
  const price = toPesewas(priceText);
  if (!Number.isFinite(price) || price <= 0 || price > MAX_PRICE_PESEWAS) return null;

  const name = tidyName(rest.slice(0, priceToken.index));
  if (name.length < 2 || !/[a-z]/i.test(name)) return null;

  return { name, pricePesewas: price, stock };
}

// "1,250.50" is one number, not two items; strip thousands separators before
// deciding what a comma means.
function normaliseNumbers(text: string): string {
  return text.replace(/(\d),(\d{3})(?=(?:\.\d{1,2})?(?:\D|$))/g, '$1$2');
}

function isBarePrice(part: string): boolean {
  return /^(?:ghs|ghc|gh₵|₵)?\s*\d+(?:[.,]\d{1,2})?\s*(?:cedis|ghs|ghc|gh₵|₵)?$/i.test(part);
}

// Commas split items, except when the piece after the comma is only a price,
// which belongs to the previous name ("Blue heels size 40, 250").
function splitLine(line: string): string[] {
  const parts = line
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length <= 1) return [line];

  const merged: string[] = [];
  for (const part of parts) {
    if (isBarePrice(part) && merged.length) merged[merged.length - 1] += ` ${part}`;
    else merged.push(part);
  }
  return merged;
}

export function parseItems(input: string): ParseResult {
  const text = normaliseNumbers((input ?? '').trim());
  if (!text) return { ok: false, reason: 'empty' };

  if (/\b\d+\s*(?:for|x)\s*\d+\b/i.test(text)) {
    return {
      ok: false,
      reason: 'ambiguous',
      hint: 'Is that one item or a bundle? Send one item per line, like "Knotless braids 300".',
    };
  }

  if (/\bdeposit\b/i.test(text)) {
    return {
      ok: false,
      reason: 'ambiguous',
      hint: 'Deposits come later. For now send the service and its full price, like "Bridal makeup 600".',
    };
  }

  if (/\bdm for price\b|\bprice on request\b|\bnegotiable\b/i.test(text)) {
    return { ok: false, reason: 'no-price', hint: 'Send the price you want on the page, like "Serum 120".' };
  }

  const lines = text
    .split(/\r?\n|;/)
    .map((line) => line.trim())
    .filter(Boolean);

  // A line with commas may hold several items ("Braids 300, Cornrows 120").
  const segments = lines.flatMap(splitLine);

  const items: ParsedItem[] = [];
  for (const segment of segments) {
    const item = parseSegment(segment);
    if (item) items.push(item);
  }

  if (!items.length) {
    return { ok: false, reason: 'no-price', hint: 'Send the name and price together, like "Vitamin C serum 120".' };
  }

  // A partly parsed list is a sign of a format we should not guess at.
  if (items.length < segments.length && segments.length > 1) {
    return {
      ok: false,
      reason: 'ambiguous',
      hint: 'I got some of those but not all. Send one item per line, like "Knotless braids 300".',
    };
  }

  if (items.length > 30) return { ok: false, reason: 'too-long', hint: 'Send up to 30 items at a time.' };

  return { ok: true, items };
}
