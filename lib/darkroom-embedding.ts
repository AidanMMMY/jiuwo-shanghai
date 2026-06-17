// Embedding client for Darkroom collective memory.
// Supports any OpenAI-compatible embeddings endpoint.
// Returns null when no API key is configured so callers can fall back to keyword retrieval.

const MAX_INPUT_CHARS = 12000;
const TIMEOUT_MS = 8000;

function getApiKey(): string | undefined {
  try {
    return (
      process.env.DARKROOM_EMBEDDING_API_KEY ||
      process.env.OPENAI_API_KEY
    );
  } catch {
    return undefined;
  }
}

function getBaseUrl(): string {
  try {
    return (
      process.env.DARKROOM_EMBEDDING_BASE_URL ||
      'https://api.openai.com/v1/embeddings'
    );
  } catch {
    return 'https://api.openai.com/v1/embeddings';
  }
}

function getModel(): string {
  try {
    return process.env.DARKROOM_EMBEDDING_MODEL || 'text-embedding-3-small';
  } catch {
    return 'text-embedding-3-small';
  }
}

export function getEmbeddingDimensions(): number {
  try {
    const dims = Number(process.env.DARKROOM_EMBEDDING_DIMENSIONS);
    return Number.isFinite(dims) && dims > 0 ? dims : 1536;
  } catch {
    return 1536;
  }
}

function truncateText(text: string): string {
  if (text.length <= MAX_INPUT_CHARS) return text;
  console.warn(
    `[darkroom:embedding] input truncated from ${text.length} to ${MAX_INPUT_CHARS} characters`
  );
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
    const res = await fetch(getBaseUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        input: truncateText(trimmed),
        model: getModel(),
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[darkroom:embedding] embedding request failed:', res.status, body);
      return null;
    }

    const data = (await res.json()) as {
      data: { embedding: number[]; index: number }[];
    };
    const embedding = data.data?.[0]?.embedding;
    const expectedDims = getEmbeddingDimensions();
    if (!Array.isArray(embedding) || embedding.length !== expectedDims) {
      console.error(
        '[darkroom:embedding] unexpected embedding shape:',
        embedding?.length,
        'expected:',
        expectedDims
      );
      return null;
    }
    return embedding;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[darkroom:embedding] embedding request timed out');
    } else {
      console.error('[darkroom:embedding] embedding request error:', error);
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
