export interface KbMatchResult {
  matched: boolean;
  matchType: 'exact' | 'keyword' | 'tags' | 'none';
  itemId?: string;
  answer?: string;
  confidence?: number;
  fallbackRequired: boolean;
}
