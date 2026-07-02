/** Discriminator for graph nodes. */
export type NodeKind =
  | "workspace"
  | "source"
  | "person"
  | "project"
  | "thread"
  | "message"
  | "decision"
  | "action_item"
  | "source_object";

/** Discriminator for typed graph edges. */
export type EdgeKind =
  | "decided_by"
  | "relates_to"
  | "supersedes"
  | "mentions"
  | "owns"
  | "blocks"
  | "derived_from";

/** Connector source types. */
export type SourceType = "github" | "slack" | "notion";

/** Status lifecycle distilled for decisions / action items. */
export type DistillStatus = "proposed" | "decided" | "in_progress" | "done" | "superseded" | "blocked";

/** A node in the permission-aware context graph. */
export interface GraphNode {
  id: string;
  workspaceId: string;
  kind: NodeKind;
  /** Stable id within the originating source (idempotency key). */
  externalId: string | null;
  sourceType: SourceType | null;
  title: string;
  body: string | null;
  /** Free-form structured metadata (author, url, timestamps, status, etc.). */
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/** A typed, directed relation between two nodes. */
export interface GraphEdge {
  id: string;
  workspaceId: string;
  kind: EdgeKind;
  srcId: string;
  dstId: string;
  metadata: Record<string, unknown>;
}

/** Raw, un-normalized item pulled from a connector. */
export interface RawItem {
  externalId: string;
  sourceType: SourceType;
  kind: NodeKind;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  /** Subjects allowed to see this item, mirrored into ACL on ingest. */
  audience: string[];
  /** Optional explicit relations to other externalIds. */
  links?: { kind: EdgeKind; toExternalId: string }[];
}

/** Permission mirror: which subject can see which resource at which scope. */
export interface AclEntry {
  id: string;
  workspaceId: string;
  subject: string;
  nodeId: string;
  scope: string;
}

/** A distilled fact (decision / why / action item / status). */
export interface Distillation {
  id: string;
  workspaceId: string;
  nodeId: string;
  kind: "decision" | "action_item";
  summary: string;
  /** The rationale — the "why". */
  rationale: string | null;
  status: DistillStatus;
  /** externalIds / nodeIds this was derived from. */
  sources: string[];
  createdAt: Date;
}

/** A retrievable chunk with its vector embedding. */
export interface Chunk {
  id: string;
  workspaceId: string;
  nodeId: string;
  content: string;
  embedding: number[] | null;
}

// ---- recall() request / response ----

export interface RecallScope {
  /** Workspace slug to search within (required). */
  workspace: string;
  /** Optional project filter. */
  project?: string;
  /** Optional source-type filter. */
  sources?: SourceType[];
}

export interface RecallRequest {
  query: string;
  scope: RecallScope;
  /** Max context items to return. */
  limit?: number;
  /** Subject whose permissions bound the result (mirrors source ACLs). */
  holder?: string;
}

export interface RecallSource {
  nodeId: string;
  title: string;
  sourceType: SourceType | null;
  url: string | null;
  score: number;
  snippet: string;
}

export interface RecallResult {
  query: string;
  /** Assembled, permission-filtered context. */
  context: string;
  sources: RecallSource[];
  /** Distilled decisions/action items relevant to the query. */
  decisions: Pick<Distillation, "summary" | "rationale" | "status">[];
}
