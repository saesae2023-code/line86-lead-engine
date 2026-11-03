export interface SearchResult {
  title: string;
  url: string;
  description?: string;
}

export interface SearchOptions {
  count?: number;
  country?: string;
  searchLang?: string;
}

export interface SearchProvider {
  name: string;
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
}
