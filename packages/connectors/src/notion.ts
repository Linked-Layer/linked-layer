import type { RawItem } from "@recall/core";
import { type Connector, ConnectorConfigError, type PullContext, type PullResult, resolveToken } from "./base";

type Json = Record<string, unknown>;

const NOTION_VERSION = "2022-06-28";

function richText(rt: unknown): string {
  if (!Array.isArray(rt)) return "";
  return rt.map((t) => (t as { plain_text?: string }).plain_text ?? "").join("");
}

/** Turn one Notion block into a line of plain text (markdown-ish). */
function blockText(block: Json): string {
  const t = block.type as string | undefined;
  if (!t) return "";
  const data = block[t] as Json | undefined;
  if (!data) return "";
  if (Array.isArray((data as { rich_text?: unknown }).rich_text)) {
    let s = richText((data as { rich_text?: unknown }).rich_text);
    if (!s) return "";
    if (t === "to_do") s = `[${(data as { checked?: boolean }).checked ? "x" : " "}] ${s}`;
    else if (t.startsWith("heading")) s = `# ${s}`;
    else if (t === "bulleted_list_item" || t === "numbered_list_item") s = `- ${s}`;
    else if (t === "quote") s = `> ${s}`;
    else if (t === "code") s = "```\n" + s + "\n```";
    return s;
  }
  if (t === "child_page") return `## ${(data as { title?: string }).title ?? ""}`;
  return "";
}

function pageTitle(page: Json): string {
  const props = (page.properties as Record<string, Json> | undefined) ?? {};
  for (const key of Object.keys(props)) {
    const p = props[key]!;
    if (p.type === "title") {
      const txt = richText(p.title);
      if (txt) return txt;
    }
  }
  return "Untitled";
}

/**
 * Notion connector (token-based; the token comes from OAuth or an internal integration).
 * Ingests every page the token can access — title + extracted block text — incrementally
 * by `last_edited_time`. config.repos is ignored (Notion scopes by shared pages).
 *
 * config: { token | tokenEnv?, audience?, externalIdPrefix?, maxPages?: 100, maxPageChars?: 20000 }
 * cursor: { since?: ISO8601 last_edited_time }
 */
export class NotionConnector implements Connector {
  readonly sourceType = "notion" as const;

  async pull(ctx: PullContext): Promise<PullResult> {
    const token = resolveToken(ctx.config, "NOTION_TOKEN");
    const audience = (ctx.config.audience as string[] | undefined) ?? ["*"];
    const idPrefix = (ctx.config.externalIdPrefix as string | undefined) ?? "";
    const maxPages = (ctx.config.maxPages as number | undefined) ?? 100;
    const maxPageChars = (ctx.config.maxPageChars as number | undefined) ?? 20_000;
    const since = ctx.cursor?.since as string | undefined;

    const headers = {
      authorization: `Bearer ${token}`,
      "notion-version": NOTION_VERSION,
      "content-type": "application/json",
    };

    const items: RawItem[] = [];
    let newest = since ?? "";
    let cursor: string | undefined;
    let fetched = 0;
    let stop = false;

    do {
      const body: Json = {
        page_size: 50,
        sort: { direction: "descending", timestamp: "last_edited_time" },
        filter: { property: "object", value: "page" },
      };
      if (cursor) body.start_cursor = cursor;

      const res = await this.post("https://api.notion.com/v1/search", headers, body);
      const results = (res.results as Json[] | undefined) ?? [];
      for (const page of results) {
        if (fetched >= maxPages) {
          stop = true;
          break;
        }
        const led = page.last_edited_time as string | undefined;
        if (since && led && led <= since) {
          stop = true;
          break;
        }
        if (led && led > newest) newest = led;

        const title = pageTitle(page);
        const text = await this.pageText(page.id as string, headers, maxPageChars, 0).catch(() => "");
        items.push({
          externalId: `notion:${idPrefix}${page.id as string}`,
          sourceType: "notion",
          kind: "source_object",
          title: `[Notion] ${title}`,
          body: text.slice(0, maxPageChars),
          metadata: { url: (page.url as string | undefined) ?? null, type: "page", pageId: page.id },
          audience,
        });
        fetched++;
      }
      cursor = res.has_more ? (res.next_cursor as string | undefined) : undefined;
    } while (cursor && !stop);

    return { items, cursor: { since: newest || since } };
  }

  /** Concatenate a page's block text, recursing into children up to a small depth/char cap. */
  private async pageText(blockId: string, headers: Record<string, string>, cap: number, depth: number): Promise<string> {
    if (depth > 2 || cap <= 0) return "";
    const out: string[] = [];
    let total = 0;
    let cursor: string | undefined;
    do {
      const url = `https://api.notion.com/v1/blocks/${blockId}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ""}`;
      const res = await this.get(url, headers);
      const blocks = (res.results as Json[] | undefined) ?? [];
      for (const b of blocks) {
        const line = blockText(b);
        if (line) {
          out.push(line);
          total += line.length;
        }
        if (b.has_children && total < cap) {
          const sub = await this.pageText(b.id as string, headers, cap - total, depth + 1);
          if (sub) {
            out.push(sub);
            total += sub.length;
          }
        }
        if (total >= cap) break;
      }
      cursor = res.has_more ? (res.next_cursor as string | undefined) : undefined;
    } while (cursor && total < cap);
    return out.join("\n");
  }

  private async get(url: string, headers: Record<string, string>): Promise<Json> {
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Notion API ${res.status} for ${url}`);
    return (await res.json()) as Json;
  }

  private async post(url: string, headers: Record<string, string>, body: Json): Promise<Json> {
    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
    if (!res.ok) {
      if (res.status === 401) throw new ConnectorConfigError("Notion token is invalid or expired");
      throw new Error(`Notion API ${res.status} for ${url}`);
    }
    return (await res.json()) as Json;
  }
}
