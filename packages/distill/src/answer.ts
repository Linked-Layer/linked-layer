import Anthropic from "@anthropic-ai/sdk";
import { config } from "@recall/core";

export interface AnswerContext {
  question: string;
  /** Assembled context block (permission-filtered). */
  context: string;
  /** Source titles for citation. */
  sourceTitles: string[];
}

const ASK_SYSTEM = `You are "ask the company" for Recall. Answer the user's question using ONLY the
provided team context. Cite sources by their title in [brackets]. If the context does not contain
the answer, say so plainly. Be concise.`;

function userPrompt(c: AnswerContext): string {
  return `Question: ${c.question}\n\nTeam context:\n${c.context}\n\nSources available: ${c.sourceTitles.join("; ")}`;
}

let client: Anthropic | null = null;
function llm(): Anthropic | null {
  if (!config.llm.apiKey) return null;
  client ??= new Anthropic({ apiKey: config.llm.apiKey });
  return client;
}

/** Stream an answer token-by-token. Falls back to an extractive answer with no API key. */
export async function* answerQuestionStream(c: AnswerContext): AsyncGenerator<string> {
  const api = llm();
  if (!api) {
    yield fallbackAnswer(c);
    return;
  }
  try {
    const stream = await api.messages.stream({
      model: config.llm.model,
      max_tokens: 1024,
      system: ASK_SYSTEM,
      messages: [{ role: "user", content: userPrompt(c) }],
    });
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield event.delta.text;
      }
    }
  } catch (err) {
    console.warn("[ask] LLM stream failed, using fallback:", (err as Error).message);
    yield fallbackAnswer(c);
  }
}

/** Non-streaming convenience wrapper. */
export async function answerQuestion(c: AnswerContext): Promise<string> {
  let out = "";
  for await (const chunk of answerQuestionStream(c)) out += chunk;
  return out;
}

function fallbackAnswer(c: AnswerContext): string {
  if (!c.context.trim()) {
    return `I don't have anything in memory about "${c.question}".`;
  }
  const cites = c.sourceTitles.length ? ` Sources: ${c.sourceTitles.map((t) => `[${t}]`).join(" ")}.` : "";
  return `Based on team memory:\n${c.context.slice(0, 800)}${cites}`;
}
