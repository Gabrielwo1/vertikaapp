import type { FastifyPluginAsync } from "fastify";
import { authenticate } from "@/plugins/auth";
import { Queue } from "bullmq";
import { SPLAT_QUEUE_NAME } from "@/queues/splat.queue";

type BullMQJobStatus =
  | "waiting"
  | "active"
  | "completed"
  | "failed"
  | "delayed"
  | "unknown";

interface JobStatusData {
  jobId: string;
  status: BullMQJobStatus;
  progress: number;
  result?: unknown;
  failReason?: string;
}

const jobsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/jobs/:jobId
   * Get a specific BullMQ job's status.
   */
  fastify.get<{ Params: { jobId: string } }>(
    "/api/jobs/:jobId",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { jobId } = request.params;

      const queue = new Queue(SPLAT_QUEUE_NAME, {
        connection: fastify.redis,
      });

      try {
        const job = await queue.getJob(jobId);

        if (!job) {
          return reply.code(404).send({
            success: false,
            message: "Job não encontrado",
          });
        }

        const state = await job.getState();
        const progress =
          typeof job.progress === "number" ? job.progress : 0;

        const jobData: JobStatusData = {
          jobId: job.id ?? jobId,
          status: state as BullMQJobStatus,
          progress,
          ...(job.returnvalue !== undefined && { result: job.returnvalue }),
          ...(job.failedReason !== undefined && {
            failReason: job.failedReason,
          }),
        };

        return reply.send({
          success: true,
          data: jobData,
        });
      } finally {
        await queue.close();
      }
    },
  );

  /**
   * GET /api/tours/:tourId/jobs
   * List all BullMQ jobs for a tour's rooms.
   */
  fastify.get<{ Params: { tourId: string } }>(
    "/api/tours/:tourId/jobs",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { tourId } = request.params;

      // Verify tour ownership
      const tour = await fastify.prisma.tour.findFirst({
        where: {
          id: tourId,
          imobiliariaId: request.authUser.imobiliariaId,
        },
        include: {
          rooms: {
            where: { jobId: { not: null } },
            select: { id: true, name: true, jobId: true, status: true },
          },
        },
      });

      if (!tour) {
        return reply.code(404).send({
          success: false,
          message: "Tour não encontrado",
        });
      }

      const queue = new Queue(SPLAT_QUEUE_NAME, {
        connection: fastify.redis,
      });

      try {
        const jobStatuses = await Promise.all(
          tour.rooms.map(async (room) => {
            if (!room.jobId) {
              return {
                roomId: room.id,
                roomName: room.name,
                roomStatus: room.status,
                jobId: null,
                jobStatus: "unknown" as BullMQJobStatus,
                progress: 0,
              };
            }

            const job = await queue.getJob(room.jobId);
            if (!job) {
              return {
                roomId: room.id,
                roomName: room.name,
                roomStatus: room.status,
                jobId: room.jobId,
                jobStatus: "unknown" as BullMQJobStatus,
                progress: 0,
              };
            }

            const state = await job.getState();
            const progress =
              typeof job.progress === "number" ? job.progress : 0;

            return {
              roomId: room.id,
              roomName: room.name,
              roomStatus: room.status,
              jobId: job.id ?? room.jobId,
              jobStatus: state as BullMQJobStatus,
              progress,
              ...(job.failedReason !== undefined && {
                failReason: job.failedReason,
              }),
            };
          }),
        );

        return reply.send({
          success: true,
          data: jobStatuses,
          total: jobStatuses.length,
        });
      } finally {
        await queue.close();
      }
    },
  );
};

export default jobsRoutes;
