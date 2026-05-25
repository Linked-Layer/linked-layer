import { processWorkspace, syncConnector } from "@recall/engine";
import { Worker } from "bullmq";
import {
  INGEST_QUEUE,
  PIPELINE_QUEUE,
  type IngestJob,
  type PipelineJob,
  connection,
  enqueuePipeline,
} from "./queue";

export { enqueueIngest, enqueuePipeline, ingestQueue, pipelineQueue } from "./queue";
export type { IngestJob, PipelineJob } from "./queue";

/** Start the ingest + pipeline workers. Ingest chains into the pipeline. */
export function startWorkers(): { close: () => Promise<void> } {
  const ingestWorker = new Worker<IngestJob>(
    INGEST_QUEUE,
    async (job) => {
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

  for (const w of [ingestWorker, pipelineWorker]) {
    w.on("failed", (job, err) => console.error(`[worker] job ${job?.id} failed:`, err.message));
  }

  console.log("✓ Recall workers started (ingest, pipeline)");

  return {
    close: async () => {
      await Promise.all([ingestWorker.close(), pipelineWorker.close()]);
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
