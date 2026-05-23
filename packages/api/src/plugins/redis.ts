import fp from "fastify-plugin";
import IORedis from "ioredis";
import type { FastifyPluginAsync } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    redis: IORedis;
  }
}

const redisPlugin: FastifyPluginAsync = async (fastify) => {
  const redisUrl = process.env["REDIS_URL"];
  if (!redisUrl) {
    throw new Error("REDIS_URL environment variable is required");
  }

  const redis = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  redis.on("error", (err: Error) => {
    fastify.log.error({ err }, "Redis connection error");
  });

  redis.on("connect", () => {
    fastify.log.info("Redis connected");
  });

  fastify.decorate("redis", redis);

  fastify.addHook("onClose", async (instance) => {
    await instance.redis.quit();
  });
};

export default fp(redisPlugin, {
  name: "redis",
});
