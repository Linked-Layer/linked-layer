import type { SourceType } from "@recall/core";
import type { Connector } from "./base";
import { GithubConnector } from "./github.stub";
import { SampleConnector } from "./sample";
import { SlackConnector } from "./slack.stub";

export * from "./base";
export { SampleConnector, SAMPLE_WORKSPACE } from "./sample";
export { GithubConnector } from "./github.stub";
export { SlackConnector } from "./slack.stub";

const registry: Record<SourceType, () => Connector> = {
  sample: () => new SampleConnector(),
  github: () => new GithubConnector(),
  slack: () => new SlackConnector(),
};

/** Resolve a connector instance by source type. */
export function getConnector(sourceType: SourceType): Connector {
  const factory = registry[sourceType];
  if (!factory) throw new Error(`Unknown connector source type: ${sourceType}`);
  return factory();
}
