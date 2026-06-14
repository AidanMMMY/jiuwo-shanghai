export interface TavilySearchOptions {
  maxResults?: number;
  searchDepth?: 'basic' | 'advanced';
  includeAnswer?: boolean;
}

export interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score?: number;
}

export interface TavilySearchResponse {
  query: string;
  results: TavilyResult[];
  answer?: string;
}

function getApiKey(): string | undefined {
  try {
    return process.env.TAVILY_API_KEY;
  } catch {
    return undefined;
  }
}

export async function searchTavily(
  query: string,
  options: TavilySearchOptions = {}
): Promise<TavilySearchResponse> {
  const apiKey = getApiKey();
  if (!apiKey || apiKey === 'dummy-key-for-build') {
    return { query, results: [] };
  }

  const {
    maxResults = 3,
    searchDepth = 'basic',
    includeAnswer = false,
  } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: maxResults,
        search_depth: searchDepth,
        include_answer: includeAnswer,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Tavily search failed: ${res.status} ${body}`);
    }

    const data = (await res.json()) as TavilySearchResponse;
    return {
      query: data.query || query,
      results: Array.isArray(data.results) ? data.results : [],
      answer: data.answer,
    };
  } catch (error: unknown) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Tavily search timed out');
    }
    throw error;
  }
}
