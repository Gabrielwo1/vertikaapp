import type { FastifyPluginAsync } from "fastify";
import { createHmac, timingSafeEqual } from "node:crypto";
import { runpodWebhookSchema } from "@virtualtour/shared";
import { getSubscriptions, sendPushNotification } from "@/services/push";

/**
 * Verifies the HMAC-SHA256 signature from RunPod webhook header.
 * Uses timing-safe comparison to prevent timing attacks.
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const expectedSignature = createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  const receivedBuffer = Buffer.from(signature, "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

const webhooksRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /webhooks/runpod
   * Receives job completion/error notifications from the RunPod GPU worker.
   *
   * Security: validates HMAC-SHA256 signature in X-RunPod-Signature header.
   */
  fastify.post(
    "/webhooks/runpod",
    {
      config: {
        rawBody: true,
      },
    },
    async (request, reply) => {
      const webhookSecret = process.env["WORKER_WEBHOOK_SECRET"];
      if (!webhookSecret) {
        fastify.log.error("WORKER_WEBHOOK_SECRET não configurado");
        return reply.code(500).send({
          success: false,
          message: "Configuração do servidor inválida",
        });
      }

      // Validate HMAC signature
      const signature = request.headers["x-runpod-signature"];
      if (typeof signature !== "string" || !signature) {
        return reply.code(401).send({
          success: false,
          message: "Assinatura ausente",
        });
      }

      const rawBody = JSON.stringify(request.body);
      const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);

      if (!isValid) {
        fastify.log.warn(
          { signature },
          "Assinatura de webhook RunPod inválida",
        );
        return reply.code(401).send({
          success: false,
          message: "Assinatura inválida",
        });
      }

      // Parse and validate body
      const parseResult = runpodWebhookSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          success: false,
          message: "Corpo do webhook inválido",
          errors: parseResult.error.errors,
        });
      }

      const webhookBody = parseResult.data;
      const { jobId, status, roomId, tourId } = webhookBody;

      fastify.log.info({ jobId, status, roomId, tourId }, "Webhook RunPod recebido");

      if (status === "complete") {
        // Update room with processed file paths
        await fastify.prisma.room.update({
          where: { id: roomId },
          data: {
            status: "DONE",
            ...(webhookBody.splatPath !== undefined && {
              splatPath: webhookBody.splatPath,
            }),
            ...(webhookBody.voxelPath !== undefined && {
              voxelPath: webhookBody.voxelPath,
            }),
            ...(webhookBody.thumbPath !== undefined && {
              thumbPath: webhookBody.thumbPath,
            }),
          },
        });

        // Check if ALL rooms of the tour are DONE
        const tour = await fastify.prisma.tour.findUnique({
          where: { id: tourId },
          include: {
            rooms: { select: { status: true } },
            imobiliaria: { select: { id: true, name: true } },
          },
        });

        if (tour) {
          const allDone = tour.rooms.every((room) => room.status === "DONE");

          if (allDone) {
            await fastify.prisma.tour.update({
              where: { id: tourId },
              data: { status: "READY" },
            });

            fastify.log.info(
              { tourId },
              "Tour pronto — todos os cômodos processados",
            );

            // Send push notification to imobiliaria subscribers
            try {
              const subscriptions = await getSubscriptions(
                tour.imobiliaria.id,
              );

              const viewerDomain =
                process.env["VIEWER_DOMAIN"] ??
                "https://viewer.virtualtour.com.br";

              await Promise.allSettled(
                subscriptions.map((subscription) =>
                  sendPushNotification(subscription, {
                    title: "Tour pronto!",
                    body: `Seu tour está pronto para visualização e publicação.`,
                    url: `${viewerDomain}/tour/${tourId}`,
                  }),
                ),
              );
            } catch (err) {
              // Non-fatal: push notification failure should not break the webhook
              fastify.log.error(
                { err, tourId },
                "Falha ao enviar notificação push",
              );
            }
          }
        }
      } else {
        // status === 'error'
        await fastify.prisma.room.update({
          where: { id: roomId },
          data: { status: "ERROR" },
        });

        fastify.log.error(
          { jobId, roomId, tourId, error: webhookBody.error },
          "Job RunPod falhou",
        );
      }

      return reply.send({
        success: true,
        message: "Webhook processado",
      });
    },
  );
};

export default webhooksRoutes;
