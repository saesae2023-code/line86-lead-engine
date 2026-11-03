import type { SearchOptions, SearchProvider, SearchResult } from './types.js';

type BraveResponse = {
  web?: {
    results?: Array<{
      title?: string;
      url?: string;
      description?: string;
    }>;
  };
};

export class BraveSearchProvider implements SearchProvider {
  name = 'brave';

  constructor(private readonly apiKey = process.env.BRAVE_SEARCH_API_KEY) {}

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    if (!this.apiKey) {
      throw new Error('BRAVE_SEARCH_API_KEY is not configured');
    }

    const params = new URLSearchParams({
      q: query,
      count: String(Math.min(options.count ?? 10, 20)),
      country: options.country ?? 'RU',
      search_lang: options.searchLang ?? 'ru',
      safesearch: 'moderate',
    });

    const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${params.toString()}`, {
      headers: {
        Accept: 'application/json',
        'X-Subscription-Token': this.apiKey,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Brave Search API ${response.status}: ${body.slice(0, 300)}`);
    }

    const payload = (await response.json()) as BraveResponse;

    return (payload.web?.results ?? [])
      .filter((item) => item.title && item.url)
      .map((item) => ({
        title: item.title as string,
        url: item.url as string,
        description: item.description,
      }));
  }
}
