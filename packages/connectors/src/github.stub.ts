import type { RawItem } from "@recall/core";
import { type Connector, ConnectorNotImplementedError, type PullContext } from "./base";

/**
 * GitHub connector — STUB. A real implementation would pull issues, PRs, review
 * threads and commit messages via the GitHub API, mapping repo/team permissions
 * into the `audience` (ACL). Left as an interface to fill in the next iteration.
 */
export class GithubConnector implements Connector {
  readonly sourceType = "github" as const;
  async pull(_ctx: PullContext): Promise<RawItem[]> {
    throw new ConnectorNotImplementedError("github");
  }
}
