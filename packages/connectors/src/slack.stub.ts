import type { RawItem } from "@recall/core";
import { type Connector, ConnectorNotImplementedError, type PullContext } from "./base";

/**
 * Slack connector — STUB. A real implementation would pull channel messages and
 * threads via the Slack API, mirroring channel membership into the `audience`
 * (ACL). Left as an interface to fill in the next iteration.
 */
export class SlackConnector implements Connector {
  readonly sourceType = "slack" as const;
  async pull(_ctx: PullContext): Promise<RawItem[]> {
    throw new ConnectorNotImplementedError("slack");
  }
}
