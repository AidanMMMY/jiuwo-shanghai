// Embedding client for Darkroom collective memory.
// Uses OpenAI text-embedding-3-small (1536 dims) by default.
// Returns null when no API key is configured so callers can fall back to keyword retrieval.

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;
const EMBEDDING_API_URL = 'https://api.openai.com/v1/embeddings';
const MAX_INPUT_CHARS = 12000;
const TIMEOUT_MS = 8000;

function getApiKey(): string | undefined {
  try {
    return process.env.DARKROOM_EMBEDDING_API_KEY || process.env.OPENAI_API_KEY;
  } catch {
    return undefined;
  }
}

function truncateText(text: string): string {
  if (text.length <= MAX_INPUT_CHARS) return text;
  return text.slice(0, MAX_INPUT_CHARS);
}

export async function generateEmbedding(text: string): Promise<number[] | null> {
  const apiKey = getApiKey();
  if (!apiKey || apiKey === 'dummy-key-for-build') {
    return null;
  }

  const trimmed = text.trim();
  if (!trimmed) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(EMBEDDING_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        input: truncateText(trimmed),
        model: EMBEDDING_MODEL,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[darkroom:embedding] OpenAI embedding failed:', res.status, body);
      return null;
    }

    const data = (await res.json()) as {
      data: { embedding: number[]; index: number }[];
    };
    const embedding = data.data?.[0]?.embedding;
    if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIMENSIONS) {
      console.error('[darkroom:embedding] unexpected embedding shape:', embedding?.length);
      return null;
    }
    return embedding;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[darkroom:embedding] OpenAI embedding timed out');
    } else {
      console.error('[darkroom:embedding] OpenAI embedding error:', error);
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
