import { z } from "zod";

export const sourceTypeSchema = z.enum(["github", "slack", "notion"]);

export const recallScopeSchema = z.object({
  workspace: z.string().min(1),
  project: z.string().min(1).optional(),
  sources: z.array(sourceTypeSchema).optional(),
});

export const recallRequestSchema = z.object({
  query: z.string().min(1, "query is required"),
  scope: recallScopeSchema,
  limit: z.number().int().positive().max(50).optional(),
  holder: z.string().optional(),
});

export const searchRequestSchema = z.object({
  query: z.string().min(1),
  scope: recallScopeSchema,
  limit: z.number().int().positive().max(100).optional(),
  holder: z.string().optional(),
});

export const writeRequestSchema = z.object({
  workspace: z.string().min(1),
  kind: z.enum(["decision", "action_item", "source_object"]),
  title: z.string().min(1),
  body: z.string().default(""),
  metadata: z.record(z.unknown()).default({}),
  audience: z.array(z.string()).default([]),
});

export const chatTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

export const attachmentSchema = z.object({
  name: z.string().max(200),
  content: z.string().max(15000),
});

export const askRequestSchema = z.object({
  question: z.string().min(1),
  scope: recallScopeSchema,
  holder: z.string().optional(),
  /** Prior conversation turns (oldest→newest) so follow-ups keep context. */
  history: z.array(chatTurnSchema).max(20).optional(),
  /** Text contents of files the user attached (capped client-side; for the LLM, not retrieval). */
  attachments: z.array(attachmentSchema).max(4).optional(),
});

export const connectorConfigSchema = z.object({
  workspace: z.string().min(1),
  sourceType: sourceTypeSchema,
  config: z.record(z.unknown()).default({}),
});

/** Per-user GitHub connection: a PAT + the repos to ingest (owner/repo). */
export const githubLinkSchema = z.object({
  token: z.string().min(10).max(255),
  repos: z.array(z.string().regex(/^[\w.-]+\/[\w.-]+$/, "use owner/repo")).min(1).max(20),
});

export const apiKeyCreateSchema = z.object({
  workspace: z.string().min(1),
  name: z.string().min(1).default("default"),
  holder: z.string().min(1),
  scopes: z.array(z.enum(["recall", "search", "ask", "write", "admin"])).optional(),
});

// Wallet ownership (Sign-In-with-Solana). A Solana address is 32–44 base58 chars.
export const walletChallengeSchema = z.object({
  address: z.string().min(32).max(44),
});

export const walletVerifySchema = z.object({
  address: z.string().min(32).max(44),
  /** base64-encoded Ed25519 signature of the challenge message. */
  signature: z.string().min(1),
  nonce: z.string().min(1),
});

export type WalletChallengeInput = z.infer<typeof walletChallengeSchema>;
export type WalletVerifyInput = z.infer<typeof walletVerifySchema>;
export type ApiKeyCreateInput = z.infer<typeof apiKeyCreateSchema>;
export type RecallRequestInput = z.infer<typeof recallRequestSchema>;
export type SearchRequestInput = z.infer<typeof searchRequestSchema>;
export type WriteRequestInput = z.infer<typeof writeRequestSchema>;
export type AskRequestInput = z.infer<typeof askRequestSchema>;
export type ConnectorConfigInput = z.infer<typeof connectorConfigSchema>;
export type GithubLinkInput = z.infer<typeof githubLinkSchema>;
