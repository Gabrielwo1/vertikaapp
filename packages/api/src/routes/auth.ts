import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { authenticate } from "@/plugins/auth";
import { googleAuthSchema, refreshTokenSchema } from "@virtualtour/shared";

interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
  expires_in: number;
  token_type: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture: string;
}

async function exchangeGoogleCode(
  code: string,
  redirectUri: string,
): Promise<GoogleUserInfo> {
  const clientId = process.env["GOOGLE_CLIENT_ID"];
  const clientSecret = process.env["GOOGLE_CLIENT_SECRET"];

  if (!clientId || !clientSecret) {
    throw new Error(
      "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured",
    );
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`Falha ao trocar código Google: ${errorText}`);
  }

  const tokens = (await tokenResponse.json()) as GoogleTokenResponse;

  const userResponse = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    },
  );

  if (!userResponse.ok) {
    throw new Error("Falha ao obter informações do usuário Google");
  }

  return (await userResponse.json()) as GoogleUserInfo;
}

const authRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /auth/google
   * Exchange Google OAuth code for a JWT token.
   */
  fastify.post(
    "/auth/google",
    {
      schema: {
        body: {
          type: "object",
          required: ["code", "redirectUri"],
          properties: {
            code: { type: "string" },
            redirectUri: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const body = googleAuthSchema.parse(request.body);

      let userInfo: GoogleUserInfo;
      try {
        userInfo = await exchangeGoogleCode(body.code, body.redirectUri);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro desconhecido";
        return reply.code(400).send({
          success: false,
          message: `Falha na autenticação Google: ${message}`,
        });
      }

      const imobiliaria = await fastify.prisma.imobiliaria.upsert({
        where: { email: userInfo.email },
        update: { name: userInfo.name },
        create: {
          email: userInfo.email,
          name: userInfo.name,
          plan: "FREE",
        },
      });

      const token = fastify.jwt.sign(
        {
          imobiliariaId: imobiliaria.id,
          email: imobiliaria.email,
          name: imobiliaria.name,
        },
        { expiresIn: "7d" },
      );

      return reply.send({
        success: true,
        data: {
          token,
          imobiliaria: {
            id: imobiliaria.id,
            name: imobiliaria.name,
            email: imobiliaria.email,
            plan: imobiliaria.plan,
          },
        },
      });
    },
  );

  /**
   * POST /auth/refresh
   * Re-issue a token from a valid (non-expired) existing token.
   */
  fastify.post(
    "/auth/refresh",
    {
      schema: {
        body: {
          type: "object",
          required: ["token"],
          properties: {
            token: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { token } = refreshTokenSchema.parse(request.body);

      let payload: { imobiliariaId: string; email: string; name: string };
      try {
        payload = fastify.jwt.verify<{
          imobiliariaId: string;
          email: string;
          name: string;
        }>(token);
      } catch {
        return reply.code(401).send({
          success: false,
          message: "Token inválido ou expirado",
        });
      }

      const newToken = fastify.jwt.sign(
        {
          imobiliariaId: payload.imobiliariaId,
          email: payload.email,
          name: payload.name,
        },
        { expiresIn: "7d" },
      );

      return reply.send({
        success: true,
        data: { token: newToken },
      });
    },
  );

  /**
   * GET /auth/me
   * Returns the authenticated imobiliaria details.
   */
  fastify.get(
    "/auth/me",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const imobiliaria = await fastify.prisma.imobiliaria.findUnique({
        where: { id: request.user.imobiliariaId },
      });

      if (!imobiliaria) {
        return reply.code(404).send({
          success: false,
          message: "Imobiliária não encontrada",
        });
      }

      return reply.send({
        success: true,
        data: { imobiliaria },
      });
    },
  );
};

export default authRoutes;
