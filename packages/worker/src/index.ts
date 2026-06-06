import { config } from "@recall/core";
import { listEnabledConnectorsWithSlug, listEnabledUserConnectors } from "@recall/db";
import { processWorkspace, syncConnector, syncUserConnector } from "@recall/engine";
import { Worker } from "bullmq";
import {
  INGEST_QUEUE,
  PIPELINE_QUEUE,
  SCHEDULE_QUEUE,
  type IngestJob,
  type PipelineJob,
  connection,
  enqueueIngest,
  enqueuePipeline,
  registerScheduledSync,
} from "./queue";

export { enqueueIngest, enqueuePipeline, ingestQueue, pipelineQueue } from "./queue";
export type { IngestJob, PipelineJob } from "./queue";

/** Start the ingest + pipeline workers. Ingest chains into the pipeline. */
export function startWorkers(): { close: () => Promise<void> } {
  const ingestWorker = new Worker<IngestJob>(
    INGEST_QUEUE,
    async (job) => {
      // Per-user connection (their own token), scoped to their wallet.
      if (job.data.holder) {
        const res = await syncUserConnector(job.data.holder, job.data.sourceType);
        console.log(`[ingest:user] ${job.data.sourceType}@${job.data.holder.slice(0, 6)}…: pulled ${res.pulled}`);
        if (res.workspaceSlug) await enqueuePipeline({ workspaceSlug: res.workspaceSlug });
        return res;
      }
      const res = await syncConnector(job.data);
      console.log(`[ingest] ${job.data.sourceType}→${job.data.workspaceSlug}: pulled ${res.pulled}`);
      await enqueuePipeline({ workspaceSlug: job.data.workspaceSlug });
      return res;
    },
    { connection, concurrency: 4 },
  );

  const pipelineWorker = new Worker<PipelineJob>(
    PIPELINE_QUEUE,
    async (job) => {
      const res = await processWorkspace(job.data.workspaceSlug);
      console.log(
        `[pipeline] ${job.data.workspaceSlug}: processed=${res.processed} nodes=${res.nodes} ` +
          `distilled=${res.distillations} chunks=${res.chunks}`,
      );
      return res;
    },
    { connection, concurrency: 2 },
  );

  // Scheduler: fan out a sync to every enabled connector on each tick.
  const scheduleWorker = new Worker(
    SCHEDULE_QUEUE,
    async () => {
      const connectors = await listEnabledConnectorsWithSlug();
      for (const c of connectors) {
        await enqueueIngest({ workspaceSlug: c.workspaceSlug, sourceType: c.sourceType });
      }
      const userConnectors = await listEnabledUserConnectors();
      for (const u of userConnectors) {
        await enqueueIngest({ workspaceSlug: u.workspaceSlug, sourceType: u.sourceType, holder: u.holder });
      }
      const total = connectors.length + userConnectors.length;
      console.log(`[schedule] enqueued sync for ${total} connector(s) (${userConnectors.length} user)`);
      return { dispatched: total };
    },
    { connection, concurrency: 1 },
  );

  for (const w of [ingestWorker, pipelineWorker, scheduleWorker]) {
    w.on("failed", (job, err) => console.error(`[worker] job ${job?.id} failed:`, err.message));
  }

  if (config.sync.intervalMs > 0) {
    void registerScheduledSync(config.sync.intervalMs);
    console.log(`✓ scheduled connector sync every ${Math.round(config.sync.intervalMs / 1000)}s`);
  }

  console.log("✓ Recall workers started (ingest, pipeline, schedule)");

  return {
    close: async () => {
      await Promise.all([ingestWorker.close(), pipelineWorker.close(), scheduleWorker.close()]);
    },
  };
}

// Run directly: `tsx src/index.ts`
if (process.argv[1]?.endsWith("index.ts") || process.argv[1]?.endsWith("worker")) {
  const handle = startWorkers();
  const shutdown = () => handle.close().then(() => process.exit(0));
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
