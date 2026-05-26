export interface CrawlerItem {
  domain: string;
  css_queries?: string[] | any;
  name?: string;
  [key: string]: any;
}

export interface WhitelistItem {
  id: string;
  originalText: string; // The raw line or item from Whitelist input
  cleanDomain: string;  // Normalized domain for comparison
  isMatched: boolean;   // True if found in Crawler JSON
  matchedItem?: CrawlerItem; // Associated configurations from the JSON
}

export interface MatchStats {
  totalWhitelist: number;
  totalConfigured: number;
  totalMissing: number;
  totalCrawlerJson: number;
}

export interface DuplicateOccurrence {
  originalText: string;
  lineNumber: number;
}

export interface DuplicateGroup {
  cleanDomain: string;
  count: number;
  occurrences: DuplicateOccurrence[];
}
