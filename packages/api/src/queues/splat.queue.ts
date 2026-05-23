import { Queue } from "bullmq";
import IORedis from "ioredis";

export const SPLAT_QUEUE_NAME = "splat-processing";

export interface SplatJobData {
  tourId: string;
  roomId: string;
  videoPath: string;
  videoUrl: string;
}

export interface SplatJobResult {
  splatPath: string;
  voxelPath: string;
  thumbPath: string;
}

function createRedisConnection(): IORedis {
  const redisUrl = process.env["REDIS_URL"];
  if (!redisUrl) {
    throw new Error("REDIS_URL environment variable is required");
  }
  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

/**
 * Lazily created BullMQ queue instance.
 * Uses a module-level singleton to avoid creating multiple connections.
 */
let queueInstance: Queue<SplatJobData, SplatJobResult> | null = null;

function getQueue(): Queue<SplatJobData, SplatJobResult> {
  if (!queueInstance) {
    const connection = createRedisConnection();
    queueInstance = new Queue<SplatJobData, SplatJobResult>(
      SPLAT_QUEUE_NAME,
      {
        connection,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 10_000,
          },
          removeOnComplete: {
            count: 100,
            age: 24 * 60 * 60, // 24 hours in seconds
          },
          removeOnFail: {
            count: 50,
            age: 7 * 24 * 60 * 60, // 7 days in seconds
          },
        },
      },
    );
  }
  return queueInstance;
}

/**
 * Enqueues a new splat processing job.
 * @param data - Job data containing tourId, roomId, videoPath and videoUrl
 * @returns The created BullMQ Job instance
 */
export async function addSplatJob(
  data: SplatJobData,
): Promise<{ id: string | undefined }> {
  const queue = getQueue();
  const jobName = `splat:${data.tourId}:${data.roomId}`;
  const job = await queue.add(jobName, data);
  return { id: job.id };
}

// Export the queue getter for use in route handlers
export { getQueue as getSplatQueue };
