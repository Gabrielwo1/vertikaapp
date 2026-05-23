import type { FastifyPluginAsync } from "fastify";
import { authenticate } from "@/plugins/auth";
import { createRoomSchema } from "@virtualtour/shared";
import {
  CHUNK_SIZE_BYTES,
  UPLOAD_RETRY_ATTEMPTS,
} from "@virtualtour/shared";
import { addSplatJob } from "@/queues/splat.queue";
import { uploadFile, getPublicUrl } from "@/services/storage";
import fs from "node:fs/promises";
import path from "node:path";

interface UploadParams {
  tourId: string;
  roomId: string;
}

interface RoomParams {
  tourId: string;
  roomId: string;
}

interface TourParams {
  tourId: string;
}

/**
 * Ensures a directory exists, creating it recursively if needed.
 */
async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

/**
 * Assembles ordered chunk files into a single output file.
 */
async function assembleChunks(
  chunkDir: string,
  totalChunks: number,
  outputPath: string,
): Promise<void> {
  const writeHandle = await fs.open(outputPath, "w");
  try {
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(chunkDir, `chunk_${i}`);
      const chunkData = await fs.readFile(chunkPath);
      await writeHandle.write(chunkData);
    }
  } finally {
    await writeHandle.close();
  }
}

/**
 * Removes a directory and all its contents.
 */
async function cleanupTempDir(dirPath: string): Promise<void> {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch {
    // Non-fatal: temp cleanup failure should not break the response
  }
}

const roomsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/tours/:tourId/rooms
   * List all rooms for a tour.
   */
  fastify.get<{ Params: TourParams }>(
    "/api/tours/:tourId/rooms",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { tourId } = request.params;

      const tour = await fastify.prisma.tour.findFirst({
        where: {
          id: tourId,
          imobiliariaId: request.authUser.imobiliariaId,
        },
      });

      if (!tour) {
        return reply.code(404).send({
          success: false,
          message: "Tour não encontrado",
        });
      }

      const rooms = await fastify.prisma.room.findMany({
        where: { tourId },
        orderBy: { order: "asc" },
      });

      return reply.send({
        success: true,
        data: rooms,
        total: rooms.length,
      });
    },
  );

  /**
   * POST /api/tours/:tourId/rooms
   * Create a new room inside a tour.
   */
  fastify.post<{ Params: TourParams }>(
    "/api/tours/:tourId/rooms",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { tourId } = request.params;
      const body = createRoomSchema.parse(request.body);

      const tour = await fastify.prisma.tour.findFirst({
        where: {
          id: tourId,
          imobiliariaId: request.authUser.imobiliariaId,
        },
      });

      if (!tour) {
        return reply.code(404).send({
          success: false,
          message: "Tour não encontrado",
        });
      }

      const room = await fastify.prisma.room.create({
        data: {
          tourId,
          name: body.name,
          order: body.order,
          status: "PENDING",
        },
      });

      return reply.code(201).send({
        success: true,
        data: room,
        message: "Cômodo criado com sucesso",
      });
    },
  );

  /**
   * DELETE /api/tours/:tourId/rooms/:roomId
   * Delete a room from a tour.
   */
  fastify.delete<{ Params: RoomParams }>(
    "/api/tours/:tourId/rooms/:roomId",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { tourId, roomId } = request.params;

      const room = await fastify.prisma.room.findFirst({
        where: {
          id: roomId,
          tourId,
          tour: { imobiliariaId: request.authUser.imobiliariaId },
        },
      });

      if (!room) {
        return reply.code(404).send({
          success: false,
          message: "Cômodo não encontrado",
        });
      }

      await fastify.prisma.room.delete({ where: { id: roomId } });

      return reply.send({
        success: true,
        message: "Cômodo removido com sucesso",
      });
    },
  );

  /**
   * POST /api/tours/:tourId/rooms/:roomId/upload
   * Chunked video upload endpoint.
   *
   * Headers:
   *   Content-Range: bytes start-end/total
   *   X-Chunk-Index: 0-based chunk index
   *   X-Total-Chunks: total number of chunks
   *
   * On final chunk: assembles file, uploads to Supabase, enqueues processing job.
   */
  fastify.post<{ Params: UploadParams }>(
    "/api/tours/:tourId/rooms/:roomId/upload",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { tourId, roomId } = request.params;

      // Validate ownership
      const room = await fastify.prisma.room.findFirst({
        where: {
          id: roomId,
          tourId,
          tour: { imobiliariaId: request.authUser.imobiliariaId },
        },
      });

      if (!room) {
        return reply.code(404).send({
          success: false,
          message: "Cômodo não encontrado",
        });
      }

      // Read and validate required headers
      const contentRange = request.headers["content-range"];
      const chunkIndexHeader = request.headers["x-chunk-index"];
      const totalChunksHeader = request.headers["x-total-chunks"];

      if (!contentRange || !chunkIndexHeader || !totalChunksHeader) {
        return reply.code(400).send({
          success: false,
          message:
            "Cabeçalhos obrigatórios ausentes: Content-Range, X-Chunk-Index, X-Total-Chunks",
        });
      }

      const chunkIndexStr = Array.isArray(chunkIndexHeader)
        ? chunkIndexHeader[0]
        : chunkIndexHeader;
      const totalChunksStr = Array.isArray(totalChunksHeader)
        ? totalChunksHeader[0]
        : totalChunksHeader;

      const chunkIndex = parseInt(chunkIndexStr ?? "", 10);
      const totalChunks = parseInt(totalChunksStr ?? "", 10);

      if (
        isNaN(chunkIndex) ||
        isNaN(totalChunks) ||
        chunkIndex < 0 ||
        totalChunks <= 0 ||
        chunkIndex >= totalChunks
      ) {
        return reply.code(400).send({
          success: false,
          message: "Valores de X-Chunk-Index ou X-Total-Chunks inválidos",
        });
      }

      // Read raw body
      const chunkBuffer = await request.body as Buffer;

      if (!Buffer.isBuffer(chunkBuffer) || chunkBuffer.length === 0) {
        return reply.code(400).send({
          success: false,
          message: "Corpo da requisição vazio ou inválido",
        });
      }

      // Save chunk to temp directory
      const chunkDir = path.join("/tmp", tourId, roomId);
      await ensureDir(chunkDir);
      const chunkPath = path.join(chunkDir, `chunk_${chunkIndex}`);
      await fs.writeFile(chunkPath, chunkBuffer);

      fastify.log.info(
        { tourId, roomId, chunkIndex, totalChunks },
        "Chunk recebido",
      );

      // Not the last chunk — acknowledge and wait for more
      if (chunkIndex < totalChunks - 1) {
        return reply.code(200).send({
          success: true,
          data: {
            status: "chunk_received",
            chunkIndex,
          },
        });
      }

      // Last chunk received — assemble, upload and enqueue
      const assembledPath = path.join(chunkDir, "video.mp4");
      try {
        await assembleChunks(chunkDir, totalChunks, assembledPath);
      } catch (err) {
        fastify.log.error({ err, tourId, roomId }, "Falha ao montar chunks");
        return reply.code(500).send({
          success: false,
          message: "Falha ao montar o arquivo de vídeo",
        });
      }

      // Upload to Supabase Storage
      const storagePath = `tours/${tourId}/${roomId}/video.mp4`;
      let videoUrl: string;
      try {
        videoUrl = await uploadFile(assembledPath, storagePath);
      } catch (err) {
        fastify.log.error({ err, tourId, roomId }, "Falha no upload para Supabase");
        return reply.code(500).send({
          success: false,
          message: "Falha ao enviar vídeo para o armazenamento",
        });
      }

      // Update room status to PROCESSING with videoPath
      await fastify.prisma.room.update({
        where: { id: roomId },
        data: {
          videoPath: storagePath,
          status: "PROCESSING",
        },
      });

      // Update tour status to UPLOADING if still DRAFT
      await fastify.prisma.tour.updateMany({
        where: {
          id: tourId,
          status: "DRAFT",
        },
        data: { status: "UPLOADING" },
      });

      // Enqueue splat processing job
      let jobId: string;
      try {
        const job = await addSplatJob({
          tourId,
          roomId,
          videoPath: storagePath,
          videoUrl,
        });
        jobId = job.id ?? `${tourId}-${roomId}`;
      } catch (err) {
        fastify.log.error({ err, tourId, roomId }, "Falha ao enfileirar job");
        return reply.code(500).send({
          success: false,
          message: "Falha ao iniciar processamento do vídeo",
        });
      }

      // Store jobId on the room
      await fastify.prisma.room.update({
        where: { id: roomId },
        data: { jobId },
      });

      // Cleanup temp files (non-blocking)
      void cleanupTempDir(chunkDir);

      fastify.log.info(
        { tourId, roomId, jobId },
        "Upload completo, job enfileirado",
      );

      return reply.code(200).send({
        success: true,
        data: {
          status: "complete",
          jobId,
        },
      });
    },
  );
};

export default roomsRoutes;
