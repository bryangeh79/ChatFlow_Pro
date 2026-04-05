/**
 * Handoff trigger configuration and keyword detection.
 */

const DEFAULT_HANDOFF_KEYWORDS = [
  '人工',
  '转人工',
  'agent',
  'human',
  '客服',
  'customer service',
  'operator',
  'support',
  'help desk',
];

/**
 * Parse comma-separated handoff keywords from env, fallback to defaults.
 * Returns lowercase trimmed keywords.
 */
export function getHandoffKeywords(): string[] {
  const envValue = process.env.CHATFLOW_HANDOFF_KEYWORDS?.trim();
  if (!envValue) {
    return DEFAULT_HANDOFF_KEYWORDS;
  }
  return envValue
    .split(',')
    .map(k => k.trim().toLowerCase())
    .filter(k => k.length > 0);
}

/**
 * Check if message text contains any handoff keyword.
 */
export function containsHandoffKeyword(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }
  const keywords = getHandoffKeywords();
  const lowerText = text.toLowerCase();
  return keywords.some(keyword => lowerText.includes(keyword));
}