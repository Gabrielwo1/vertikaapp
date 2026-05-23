import type { FastifyPluginAsync } from "fastify";
import { Prisma } from "@prisma/client";
import { authenticate } from "@/plugins/auth";
import {
  createTourSchema,
  updateTourSchema,
  validateSettings,
} from "@virtualtour/shared";

const VIEWER_DOMAIN =
  process.env["VIEWER_DOMAIN"] ?? "https://viewer.virtualtour.com.br";

const toursRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/tours
   * List all tours for the authenticated imobiliaria, with room count.
   */
  fastify.get(
    "/api/tours",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const tours = await fastify.prisma.tour.findMany({
        where: {
          imobiliariaId: request.authUser.imobiliariaId,
          status: { not: "ARCHIVED" },
        },
        include: {
          _count: { select: { rooms: true } },
          rooms: { orderBy: { order: "asc" } },
        },
        orderBy: { createdAt: "desc" },
      });

      return reply.send({
        success: true,
        data: tours,
        total: tours.length,
      });
    },
  );

  /**
   * POST /api/tours
   * Create a new tour with initial rooms.
   */
  fastify.post(
    "/api/tours",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const body = createTourSchema.parse(request.body);

      const tour = await fastify.prisma.tour.create({
        data: {
          imobiliariaId: request.authUser.imobiliariaId,
          address: body.address,
          price: body.price != null ? body.price : null,
          status: "DRAFT",
          rooms: {
            create: body.rooms.map((name, index) => ({
              name,
              order: index,
              status: "PENDING",
            })),
          },
        },
        include: {
          rooms: { orderBy: { order: "asc" } },
        },
      });

      return reply.code(201).send({
        success: true,
        data: tour,
        message: "Tour criado com sucesso",
      });
    },
  );

  /**
   * GET /api/tours/:tourId
   * Get a single tour with all its rooms.
   */
  fastify.get<{ Params: { tourId: string } }>(
    "/api/tours/:tourId",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { tourId } = request.params;

      const tour = await fastify.prisma.tour.findFirst({
        where: {
          id: tourId,
          imobiliariaId: request.authUser.imobiliariaId,
        },
        include: {
          rooms: { orderBy: { order: "asc" } },
        },
      });

      if (!tour) {
        return reply.code(404).send({
          success: false,
          message: "Tour não encontrado",
        });
      }

      return reply.send({
        success: true,
        data: tour,
      });
    },
  );

  /**
   * PATCH /api/tours/:tourId
   * Update tour fields: address, price, settingsJson, status.
   */
  fastify.patch<{ Params: { tourId: string } }>(
    "/api/tours/:tourId",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { tourId } = request.params;
      const body = updateTourSchema.parse(request.body);

      const existing = await fastify.prisma.tour.findFirst({
        where: {
          id: tourId,
          imobiliariaId: request.authUser.imobiliariaId,
        },
      });

      if (!existing) {
        return reply.code(404).send({
          success: false,
          message: "Tour não encontrado",
        });
      }

      // Validate settingsJson if provided
      if (body.settingsJson !== undefined) {
        try {
          validateSettings(body.settingsJson);
        } catch {
          return reply.code(400).send({
            success: false,
            message: "settingsJson inválido. Verifique o esquema de configurações.",
          });
        }
      }

      const updateData: Prisma.TourUpdateInput = {};
      if (body.address !== undefined) updateData.address = body.address;
      if (body.price !== undefined) updateData.price = body.price;
      if (body.settingsJson !== undefined) {
        updateData.settingsJson =
          body.settingsJson as Prisma.InputJsonValue;
      }
      if (body.status !== undefined) updateData.status = body.status;

      const updated = await fastify.prisma.tour.update({
        where: { id: tourId },
        data: updateData,
        include: {
          rooms: { orderBy: { order: "asc" } },
        },
      });

      return reply.send({
        success: true,
        data: updated,
        message: "Tour atualizado com sucesso",
      });
    },
  );

  /**
   * DELETE /api/tours/:tourId
   * Soft delete: set status to ARCHIVED.
   */
  fastify.delete<{ Params: { tourId: string } }>(
    "/api/tours/:tourId",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { tourId } = request.params;

      const existing = await fastify.prisma.tour.findFirst({
        where: {
          id: tourId,
          imobiliariaId: request.authUser.imobiliariaId,
        },
      });

      if (!existing) {
        return reply.code(404).send({
          success: false,
          message: "Tour não encontrado",
        });
      }

      await fastify.prisma.tour.update({
        where: { id: tourId },
        data: { status: "ARCHIVED" },
      });

      return reply.send({
        success: true,
        message: "Tour arquivado com sucesso",
      });
    },
  );

  /**
   * POST /api/tours/:tourId/publish
   * Publish a tour: set publishedAt and status=PUBLISHED.
   */
  fastify.post<{ Params: { tourId: string } }>(
    "/api/tours/:tourId/publish",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { tourId } = request.params;

      const existing = await fastify.prisma.tour.findFirst({
        where: {
          id: tourId,
          imobiliariaId: request.authUser.imobiliariaId,
        },
        include: {
          rooms: true,
        },
      });

      if (!existing) {
        return reply.code(404).send({
          success: false,
          message: "Tour não encontrado",
        });
      }

      if (existing.status !== "READY") {
        return reply.code(400).send({
          success: false,
          message:
            "Apenas tours com status READY podem ser publicados. Aguarde o processamento.",
        });
      }

      const publishedAt = new Date();

      await fastify.prisma.tour.update({
        where: { id: tourId },
        data: {
          status: "PUBLISHED",
          publishedAt,
        },
      });

      const viewerUrl = `${VIEWER_DOMAIN}/tour/${tourId}`;

      return reply.send({
        success: true,
        data: {
          tourId,
          viewerUrl,
          publishedAt,
        },
        message: "Tour publicado com sucesso",
      });
    },
  );
};

export default toursRoutes;
