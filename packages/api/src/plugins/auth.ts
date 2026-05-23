import fp from "fastify-plugin";
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";

export interface AuthTokenPayload {
  imobiliariaId: string;
  email: string;
  name: string;
}

// Extend @fastify/jwt's TokenOrPayload type via declaration merging on FastifyRequest.
// @fastify/jwt declares `user` as `string | object | Buffer`, so we widen our
// accessor to use a separate decorated property to avoid the conflict.
declare module "fastify" {
  interface FastifyRequest {
    // authenticated user payload attached after JWT verification
    authUser: AuthTokenPayload;
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorateRequest("authUser", null);
};

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    const payload = await request.jwtVerify<AuthTokenPayload>();
    request.authUser = payload;
  } catch (_err) {
    reply.code(401).send({
      success: false,
      message: "Não autorizado. Token inválido ou expirado.",
    });
  }
}

export default fp(authPlugin, {
  name: "auth",
});
