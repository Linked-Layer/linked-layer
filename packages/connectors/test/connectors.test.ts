import { afterEach, describe, expect, it, vi } from "vitest";
import { GithubConnector, SlackConnector } from "@recall/connectors";

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.GH_TOKEN;
  delete process.env.SLACK_TOKEN;
});

describe("GithubConnector", () => {
  it("maps issues+comments and advances the cursor", async () => {
    process.env.GH_TOKEN = "x";
    const fetchMock = vi.fn((url: string) => {
      if (url.includes("/comments")) {
        return Promise.resolve(jsonResponse([{ user: { login: "bob" }, body: "use postgres" }]));
      }
      if (url.includes("/issues")) {
        return Promise.resolve(
          jsonResponse([
            {
              number: 7,
              title: "Pick a DB",
              body: "Let's choose.",
              html_url: "https://gh/acme/app/issues/7",
              state: "closed",
              user: { login: "alice" },
              updated_at: "2026-05-10T00:00:00Z",
              comments: 1,
              comments_url: "https://api.github.com/repos/acme/app/issues/7/comments",
            },
          ]),
        );
      }
      return Promise.resolve(jsonResponse([]));
    });
    vi.stubGlobal("fetch", fetchMock);

    const c = new GithubConnector();
    const res = await c.pull({ workspace: "acme", config: { repos: ["acme/app"], tokenEnv: "GH_TOKEN" } });

    expect(res.items).toHaveLength(1);
    const item = res.items[0]!;
    expect(item.externalId).toBe("github:acme/app#7");
    expect(item.title).toContain("acme/app#7");
    expect(item.body).toContain("use postgres");
    expect(item.audience).toEqual(["*"]);
    expect(res.cursor).toEqual({ since: "2026-05-10T00:00:00Z" });
  });

  it("throws without repos config", async () => {
    process.env.GH_TOKEN = "x";
    await expect(new GithubConnector().pull({ workspace: "acme", config: {} })).rejects.toThrow(/repos/);
  });
});

describe("SlackConnector", () => {
  it("maps messages, filters system subtypes, advances per-channel cursor", async () => {
    process.env.SLACK_TOKEN = "x";
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          jsonResponse({
            ok: true,
            messages: [
              { type: "message", user: "U1", text: "ship it", ts: "1700000001.0" },
              { type: "message", subtype: "channel_join", user: "U2", ts: "1700000002.0" },
            ],
          }),
        ),
      ),
    );

    const res = await new SlackConnector().pull({ workspace: "acme", config: { channels: ["C1"] } });
    expect(res.items).toHaveLength(1);
    expect(res.items[0]!.externalId).toBe("slack:C1:1700000001.0");
    expect(res.cursor).toEqual({ oldest: { C1: "1700000001.0" } });
  });
});
