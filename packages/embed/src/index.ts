import { config } from "@recall/core";

/** Vector dimensionality. MUST match the `vector(N)` column in the DB schema. */
export const EMBED_DIM = 1024;

export interface EmbeddingProvider {
  readonly name: string;
  readonly dim: number;
  embed(texts: string[]): Promise<number[][]>;
}

function normalize(vec: number[]): number[] {
  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  return vec.map((v) => v / norm);
}

/**
 * Deterministic, dependency-free embeddings for local dev / tests.
 * Hashes token n-grams into a fixed-dim bag-of-features, then L2-normalizes.
 * Not semantically strong, but stable and good enough to exercise the pipeline.
 */
export class StubEmbeddingProvider implements EmbeddingProvider {
  readonly name = "stub";
  readonly dim = EMBED_DIM;

  private hash(s: string): number {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  private embedOne(text: string): number[] {
    const vec = new Array<number>(this.dim).fill(0);
    const tokens = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
    for (let i = 0; i < tokens.length; i++) {
      const uni = tokens[i]!;
      const ku = this.hash(uni) % this.dim;
      vec[ku] = (vec[ku] ?? 0) + 1;
      if (i + 1 < tokens.length) {
        const kb = this.hash(`${uni}_${tokens[i + 1]}`) % this.dim;
        vec[kb] = (vec[kb] ?? 0) + 0.5;
      }
    }
    return normalize(vec);
  }

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((t) => this.embedOne(t));
  }
}

/** Voyage AI embeddings (Anthropic-recommended). Requires VOYAGE_API_KEY. */
export class VoyageEmbeddingProvider implements EmbeddingProvider {
  readonly name = "voyage";
  readonly dim = EMBED_DIM;
  constructor(
    private readonly apiKey: string,
    private readonly model = config.embed.model,
  ) {}

  async embed(texts: string[]): Promise<number[][]> {
    const res = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ input: texts, model: this.model, output_dimension: this.dim }),
    });
    if (!res.ok) {
      throw new Error(`Voyage embeddings failed: ${res.status} ${await res.text()}`);
    }
    const json = (await res.json()) as { data: { embedding: number[] }[] };
    return json.data.map((d) => d.embedding);
  }
}

let cached: EmbeddingProvider | null = null;

/** Resolve the configured embedding provider (singleton). */
export function getEmbeddingProvider(): EmbeddingProvider {
  if (cached) return cached;
  if (config.embed.provider === "voyage") {
    if (!config.embed.voyageApiKey) {
      throw new Error("EMBED_PROVIDER=voyage but VOYAGE_API_KEY is not set");
    }
    cached = new VoyageEmbeddingProvider(config.embed.voyageApiKey);
  } else {
    cached = new StubEmbeddingProvider();
  }
  return cached;
}
