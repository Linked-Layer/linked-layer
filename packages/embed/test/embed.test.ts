import { describe, expect, it } from "vitest";
import { EMBED_DIM, StubEmbeddingProvider, chunkText } from "@recall/embed";

describe("chunkText", () => {
  it("returns a single chunk for short text", () => {
    expect(chunkText("hello world")).toEqual(["hello world"]);
  });

  it("splits long text into overlapping chunks", () => {
    const para = "Sentence number that is reasonably long. ".repeat(80); // ~3200 chars
    const chunks = chunkText(para, { size: 1000, overlap: 150 });
    expect(chunks.length).toBeGreaterThan(2);
    expect(Math.max(...chunks.map((c) => c.length))).toBeLessThanOrEqual(1000);
  });
});

describe("StubEmbeddingProvider", () => {
  const p = new StubEmbeddingProvider();

  it("produces vectors of the schema dimensionality", async () => {
    const [v] = await p.embed(["hello world"]);
    expect(v).toHaveLength(EMBED_DIM);
    expect(EMBED_DIM).toBe(1024);
  });

  it("is deterministic", async () => {
    const [a] = await p.embed(["why did we pick Solana"]);
    const [b] = await p.embed(["why did we pick Solana"]);
    expect(a).toEqual(b);
  });

  it("is L2-normalized", async () => {
    const [v] = await p.embed(["pgvector hybrid retrieval"]);
    const norm = Math.sqrt(v!.reduce((s, x) => s + x * x, 0));
    expect(norm).toBeCloseTo(1, 5);
  });

  it("separates dissimilar texts more than similar ones (cosine)", async () => {
    const [solana] = await p.embed(["solana x402 micropayments rail"]);
    const [solana2] = await p.embed(["solana x402 payment rail for agents"]);
    const [hr] = await p.embed(["quarterly compensation review notes"]);
    const cos = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i]!, 0);
    expect(cos(solana!, solana2!)).toBeGreaterThan(cos(solana!, hr!));
  });
});
