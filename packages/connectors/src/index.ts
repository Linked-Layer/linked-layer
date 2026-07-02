import type { SourceType } from "@recall/core";
import type { Connector } from "./base";
import { GithubConnector } from "./github";
import { NotionConnector } from "./notion";
import { SlackConnector } from "./slack";

export * from "./base";
export { GithubConnector } from "./github";
export { NotionConnector } from "./notion";
export { SlackConnector } from "./slack";

const registry: Record<SourceType, () => Connector> = {
  github: () => new GithubConnector(),
  slack: () => new SlackConnector(),
  notion: () => new NotionConnector(),
};

/** Resolve a connector instance by source type. */
export function getConnector(sourceType: SourceType): Connector {
  const factory = registry[sourceType];
  if (!factory) throw new Error(`Unknown connector source type: ${sourceType}`);
  return factory();
}
