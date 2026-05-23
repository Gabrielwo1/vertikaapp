import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";

import prismaPlugin from "@/plugins/prisma";
import redisPlugin from "@/plugins/redis";
import authPlugin from "@/plugins/auth";

import authRoutes from "@/routes/auth";
import toursRoutes from "@/routes/tours";
import roomsRoutes from "@/routes/rooms";
import jobsRoutes from "@/routes/jobs";
import webhooksRoutes from "@/routes/webhooks";

const IS_DEV = process.env["NODE_ENV"] !== "production";
const IS_TEST = process.env["NODE_ENV"] === "test";
const PORT = parseInt(process.env["PORT"] ?? "3001", 10);
const HOST = "0.0.0.0";

const MAX_CHUNK_BODY_SIZE = 6 * 1024 * 1024; // 6 MB — slightly above CHUNK_SIZE_BYTES

async function buildServer() {
  const fastify = Fastify({
    logger: IS_TEST
      ? false
      : IS_DEV
        ? {
            transport: {
              target: "pino-pretty",
              options: {
                translateTime: "HH:MM:ss Z",
                ignore: "pid,hostname",
              },
            },
          }
        : true,
    bodyLimit: MAX_CHUNK_BODY_SIZE,
  });

  // -------------------------------------------------------------------------
  // Plugins
  // -------------------------------------------------------------------------

  await fastify.register(cors, {
    origin: IS_DEV ? true : (process.env["ALLOWED_ORIGINS"] ?? "").split(","),
    credentials: true,
  });

  const jwtSecret = process.env["JWT_SECRET"];
  if (!jwtSecret) {
    throw new Error("JWT_SECRET environment variable is required");
  }

  await fastify.register(jwt, {
    secret: jwtSecret,
    sign: { expiresIn: "7d" },
  });

  await fastify.register(multipart, {
    limits: {
      fileSize: MAX_CHUNK_BODY_SIZE,
    },
  });

  await fastify.register(prismaPlugin);
  await fastify.register(redisPlugin);
  await fastify.register(authPlugin);

  // -------------------------------------------------------------------------
  // Content-type parser for raw binary uploads (chunked video upload)
  // -------------------------------------------------------------------------
  fastify.addContentTypeParser(
    ["video/mp4", "application/octet-stream"],
    { parseAs: "buffer", bodyLimit: MAX_CHUNK_BODY_SIZE },
    (_req, body, done) => {
      done(null, body);
    },
  );

  // -------------------------------------------------------------------------
  // Routes
  // -------------------------------------------------------------------------

  await fastify.register(authRoutes);
  await fastify.register(toursRoutes);
  await fastify.register(roomsRoutes);
  await fastify.register(jobsRoutes);
  await fastify.register(webhooksRoutes);

  // -------------------------------------------------------------------------
  // Health check
  // -------------------------------------------------------------------------

  fastify.get("/health", async (_request, reply) => {
    return reply.send({
      success: true,
      data: {
        status: "ok",
        timestamp: new Date().toISOString(),
        version: process.env["npm_package_version"] ?? "0.0.1",
      },
    });
  });

  return fastify;
}

async function start() {
  const fastify = await buildServer();

  // -------------------------------------------------------------------------
  // Graceful shutdown
  // -------------------------------------------------------------------------

  const shutdown = async (signal: string) => {
    fastify.log.info({ signal }, "Encerrando servidor...");
    try {
      await fastify.close();
      fastify.log.info("Servidor encerrado com sucesso");
      process.exit(0);
    } catch (err) {
      fastify.log.error({ err }, "Erro ao encerrar servidor");
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  try {
    await fastify.listen({ port: PORT, host: HOST });
    fastify.log.info(
      { port: PORT, host: HOST },
      `Servidor VirtualTour API iniciado`,
    );
  } catch (err) {
    fastify.log.error({ err }, "Falha ao iniciar servidor");
    process.exit(1);
  }
}

// Only call start() when running directly, not when imported in tests
if (process.env["NODE_ENV"] !== "test") {
  void start();
}

export { buildServer };
