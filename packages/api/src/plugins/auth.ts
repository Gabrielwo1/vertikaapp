import fp from "fastify-plugin";
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";

export interface AuthTokenPayload {
  imobiliariaId: string;
  email: string;
  name: string;
}

declare module "fastify" {
  interface FastifyRequest {
    user: AuthTokenPayload;
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorateRequest("user", null);
};

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    const payload = await request.jwtVerify<AuthTokenPayload>();
    request.user = payload;
  } catch (err) {
    reply.code(401).send({
      success: false,
      message: "Não autorizado. Token inválido ou expirado.",
    });
  }
}

export default fp(authPlugin, {
  name: "auth",
});
