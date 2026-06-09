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
    // includeCode:false keeps this focused on the issues/comments path; the
    // code-ingestion path (and its tree cursor) is covered separately below.
    const res = await c.pull({
      workspace: "acme",
      config: { repos: ["acme/app"], tokenEnv: "GH_TOKEN", includeCode: false },
    });

    expect(res.items).toHaveLength(1);
    const item = res.items[0]!;
    expect(item.externalId).toBe("github:acme/app#7");
    expect(item.title).toContain("acme/app#7");
    expect(item.body).toContain("use postgres");
    expect(item.audience).toEqual(["*"]);
    expect(res.cursor).toEqual({ since: "2026-05-10T00:00:00Z", trees: {} });
  });

  it("ingests repo files and advances the tree cursor", async () => {
    process.env.GH_TOKEN = "x";
    const fetchMock = vi.fn((url: string) => {
      if (url.includes("/issues")) return Promise.resolve(jsonResponse([]));
      if (url.endsWith("/repos/acme/app")) {
        return Promise.resolve(jsonResponse({ default_branch: "main" }));
      }
      if (url.includes("/git/trees/")) {
        return Promise.resolve(
          jsonResponse({
            sha: "treesha123",
            tree: [
              { path: "README.md", type: "blob", sha: "blob1", size: 42 },
              { path: "pnpm-lock.yaml", type: "blob", sha: "blob2", size: 10 }, // ignored
            ],
          }),
        );
      }
      if (url.includes("/git/blobs/blob1")) {
        return Promise.resolve(
          jsonResponse({ encoding: "base64", content: Buffer.from("# Acme app").toString("base64") }),
        );
      }
      return Promise.resolve(jsonResponse([]));
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await new GithubConnector().pull({
      workspace: "acme",
      config: { repos: ["acme/app"], tokenEnv: "GH_TOKEN" },
    });

    const files = res.items.filter((i) => i.kind === "source_object");
    expect(files).toHaveLength(1); // README ingested, lockfile filtered out
    const readme = files[0]!;
    expect(readme.externalId).toBe("github:acme/app:file:README.md");
    expect(readme.body).toContain("# Acme app");
    expect(res.cursor.trees).toEqual({ "acme/app": "treesha123" });
  });

  it("skips file fetches when the tree SHA is unchanged", async () => {
    process.env.GH_TOKEN = "x";
    const fetchMock = vi.fn((url: string) => {
      if (url.includes("/issues")) return Promise.resolve(jsonResponse([]));
      if (url.endsWith("/repos/acme/app")) return Promise.resolve(jsonResponse({ default_branch: "main" }));
      if (url.includes("/git/trees/")) {
        return Promise.resolve(jsonResponse({ sha: "treesha123", tree: [{ path: "README.md", type: "blob", sha: "b1", size: 1 }] }));
      }
      return Promise.resolve(jsonResponse([]));
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await new GithubConnector().pull({
      workspace: "acme",
      config: { repos: ["acme/app"], tokenEnv: "GH_TOKEN" },
      cursor: { trees: { "acme/app": "treesha123" } },
    });

    expect(res.items.filter((i) => i.kind === "source_object")).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining("/git/blobs/"), expect.anything());
    expect(res.cursor.trees).toEqual({ "acme/app": "treesha123" });
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
