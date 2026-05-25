import type { RawItem } from "@recall/core";
import { type Connector, ConnectorConfigError, type PullContext, type PullResult, resolveToken } from "./base";

interface SlackMessage {
  type: string;
  user?: string;
  text?: string;
  ts: string;
  subtype?: string;
}
interface SlackHistoryResponse {
  ok: boolean;
  error?: string;
  messages?: SlackMessage[];
}

/**
 * Slack connector (bot-token based). Ingests channel messages incrementally by ts.
 *
 * config: { channels: ["C123", ...], tokenEnv?: "SLACK_TOKEN", apiBase?: "https://slack.com/api", limit?: 100 }
 * cursor: { oldest?: { [channelId]: ts } }
 */
export class SlackConnector implements Connector {
  readonly sourceType = "slack" as const;

  async pull(ctx: PullContext): Promise<PullResult> {
    const channels = (ctx.config.channels as string[] | undefined) ?? [];
    if (channels.length === 0) throw new ConnectorConfigError("slack connector requires config.channels: ['C123']");
    const token = resolveToken(ctx.config, "SLACK_TOKEN");
    const apiBase = (ctx.config.apiBase as string | undefined) ?? "https://slack.com/api";
    const limit = (ctx.config.limit as number | undefined) ?? 100;
    const oldestByChannel = (ctx.cursor?.oldest as Record<string, string> | undefined) ?? {};

    const headers = { authorization: `Bearer ${token}`, "user-agent": "recall-connector" };
    const items: RawItem[] = [];
    const nextOldest: Record<string, string> = { ...oldestByChannel };

    for (const channel of channels) {
      const url = new URL(`${apiBase}/conversations.history`);
      url.searchParams.set("channel", channel);
      url.searchParams.set("limit", String(limit));
      const oldest = oldestByChannel[channel];
      if (oldest) url.searchParams.set("oldest", oldest);

      const res = await fetch(url.toString(), { headers });
      const json = (await res.json()) as SlackHistoryResponse;
      if (!json.ok) throw new Error(`Slack API error for ${channel}: ${json.error ?? "unknown"}`);

      let maxTs = oldest ?? "0";
      for (const m of json.messages ?? []) {
        if (m.type !== "message" || m.subtype) continue; // skip joins/bots/system
        items.push({
          externalId: `slack:${channel}:${m.ts}`,
          sourceType: "slack",
          kind: "message",
          title: `Slack ${channel} @${m.user ?? "unknown"}`,
          body: m.text ?? "",
          metadata: { channel, user: m.user ?? null, ts: m.ts },
          // Team-visible. Granular channel membership is a future refinement.
          audience: ["*"],
        });
        if (Number(m.ts) > Number(maxTs)) maxTs = m.ts;
      }
      nextOldest[channel] = maxTs;
    }

    return { items, cursor: { oldest: nextOldest } };
  }
}
