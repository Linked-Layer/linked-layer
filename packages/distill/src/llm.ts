import Anthropic from "@anthropic-ai/sdk";
import { config } from "@recall/core";

/**
 * Provider-agnostic LLM client used by both "ask" (streaming answers) and
 * distillation (one-shot extraction). Selected by `LLM_PROVIDER`:
 *   - "anthropic"  → Claude via the official SDK
 *   - "perplexity" → Perplexity (OpenAI-compatible /chat/completions) over fetch
 *
 * Returns `null` (→ heuristic / extractive fallback) when no API key is set, so
 * the whole pipeline still runs offline.
 */

export interface LlmRequest {
  system: string;
  user: string;
  maxTokens?: number;
  /** Prefer the cheaper/faster model when the provider distinguishes one. */
  fast?: boolean;
}

export interface LlmClient {
  readonly provider: string;
  /** One-shot completion → full text. */
  complete(req: LlmRequest): Promise<string>;
  /** Stream the completion token-by-token. */
  stream(req: LlmRequest): AsyncGenerator<string>;
}

function modelFor(req: LlmRequest): string {
  return req.fast ? config.llm.fastModel : config.llm.model;
}

// ---------------------------------------------------------------- Anthropic --

class AnthropicClient implements LlmClient {
  readonly provider = "anthropic";
  private readonly client: Anthropic;

  constructor(apiKey: string, baseURL?: string) {
    this.client = new Anthropic(baseURL ? { apiKey, baseURL } : { apiKey });
  }

  async complete(req: LlmRequest): Promise<string> {
    const msg = await this.client.messages.create({
      model: modelFor(req),
      max_tokens: req.maxTokens ?? config.llm.maxTokens,
      system: req.system,
      messages: [{ role: "user", content: req.user }],
    });
    return msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
  }

  async *stream(req: LlmRequest): AsyncGenerator<string> {
    const s = this.client.messages.stream({
      model: modelFor(req),
      max_tokens: req.maxTokens ?? config.llm.maxTokens,
      system: req.system,
      messages: [{ role: "user", content: req.user }],
    });
    for await (const event of s) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield event.delta.text;
      }
    }
  }
}

// --------------------------------------------------------------- Perplexity --
// OpenAI-compatible Chat Completions API. Docs: https://docs.perplexity.ai

class PerplexityClient implements LlmClient {
  readonly provider = "perplexity";

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
  ) {}

  private headers(): Record<string, string> {
    return { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" };
  }

  private body(req: LlmRequest, stream: boolean): string {
    return JSON.stringify({
      model: modelFor(req),
      max_tokens: req.maxTokens ?? config.llm.maxTokens,
      stream,
      messages: [
        { role: "system", content: req.system },
        { role: "user", content: req.user },
      ],
    });
  }

  private async post(req: LlmRequest, stream: boolean): Promise<Response> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.headers(),
      body: this.body(req, stream),
    });
    if (!res.ok) {
      throw new Error(`Perplexity API ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    return res;
  }

  async complete(req: LlmRequest): Promise<string> {
    const res = await this.post(req, false);
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return json.choices?.[0]?.message?.content ?? "";
  }

  async *stream(req: LlmRequest): AsyncGenerator<string> {
    const res = await this.post(req, true);
    if (!res.body) throw new Error("Perplexity API returned no stream body");
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      // SSE frames are newline-delimited; keep the trailing partial line in `buf`.
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        const t = line.trim();
        if (!t.startsWith("data:")) continue;
        const data = t.slice(5).trim();
        if (data === "[DONE]") return;
        try {
          const json = JSON.parse(data) as { choices?: { delta?: { content?: string } }[] };
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch {
          // keep-alive / partial frame — ignore
        }
      }
    }
  }
}

// ------------------------------------------------------------------ factory --

let instance: LlmClient | null = null;

/** Resolve the configured LLM client, or `null` when no API key is set. */
export function getLlm(): LlmClient | null {
  if (instance) return instance;
  if (!config.llm.apiKey) return null;
  instance =
    config.llm.provider === "perplexity"
      ? new PerplexityClient(config.llm.apiKey, config.llm.baseUrl)
      : new AnthropicClient(config.llm.apiKey, config.llm.baseUrl || undefined);
  return instance;
}
