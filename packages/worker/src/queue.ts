import { config } from "@recall/core";
import type { SourceType } from "@recall/core";
import { Queue, type ConnectionOptions } from "bullmq";

/**
 * BullMQ connection as plain options (not an ioredis instance) so importing this
 * module from the API does not open a socket until an enqueue actually happens,
 * and so we avoid ioredis version-identity clashes with bullmq's bundled copy.
 */
const redisUrl = new URL(config.redisUrl);
export const connection: ConnectionOptions = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6379),
  password: redisUrl.password || undefined,
  maxRetriesPerRequest: null,
};

export interface IngestJob {
  workspaceSlug: string;
  workspaceName?: string;
  sourceType: SourceType;
  config?: Record<string, unknown>;
}

export interface PipelineJob {
  workspaceSlug: string;
}

export const INGEST_QUEUE = "recall.ingest";
export const PIPELINE_QUEUE = "recall.pipeline";
export const SCHEDULE_QUEUE = "recall.schedule";

export const ingestQueue = new Queue<IngestJob>(INGEST_QUEUE, { connection });
export const pipelineQueue = new Queue<PipelineJob>(PIPELINE_QUEUE, { connection });
export const scheduleQueue = new Queue(SCHEDULE_QUEUE, { connection });

/** Register (or refresh) the repeatable "sync all enabled connectors" job. */
export async function registerScheduledSync(everyMs: number): Promise<void> {
  await scheduleQueue.add(
    "sync-all",
    {},
    { repeat: { every: everyMs }, jobId: "sync-all", removeOnComplete: 10, removeOnFail: 10 },
  );
}

/** Enqueue a connector sync (worker will chain the pipeline afterwards). */
export async function enqueueIngest(job: IngestJob): Promise<string> {
  const added = await ingestQueue.add("sync", job, { removeOnComplete: 100, removeOnFail: 100 });
  return added.id!;
}

/** Enqueue a pipeline (distill + embed) run for a workspace. */
export async function enqueuePipeline(job: PipelineJob): Promise<string> {
  const added = await pipelineQueue.add("process", job, { removeOnComplete: 100, removeOnFail: 100 });
  return added.id!;
}
