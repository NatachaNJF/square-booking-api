import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./trpc-core.js";
import {
  getRooms,
  getRoomById,
  checkAvailability,
  getRoomSetups,
  getAdditionalOptions,
  updateAdditionalOption,
  getPendingReservations,
  getReservationsByUser,
  createReservation,
  updateReservationStatus
} from "./db.js";

export const appRouter = router({
  system: router({
    health: publicProcedure.query(() => ({ status: 'ok', timestamp: new Date().toISOString() })),
  }),

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user || null),
    logout: publicProcedure.mutation(() => ({ success: true })),
  }),

  rooms: router({
    list: publicProcedure.query(async () => getRooms()),
    getById: publicProcedure.input(z.number()).query(async ({ input }) => getRoomById(input)),
  }),

  roomSetups: router({
    list: publicProcedure.query(async () => getRoomSetups()),
  }),

  options: router({
    list: publicProcedure.query(async () => getAdditionalOptions()),
    update: protectedProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), price: z.number().optional() }))
      .mutation(async ({ input }) => updateAdditionalOption(input.id, input)),
  }),

  reservations: router({
    list: protectedProcedure.query(async ({ ctx }) => getReservationsByUser(ctx.user.id)),
    listPending: protectedProcedure.query(async () => getPendingReservations()),
    create: publicProcedure
      .input(z.object({
        roomId: z.number(),
        startTime: z.string(),
        endTime: z.string(),
        duration: z.number(),
        pricePerUnit: z.number(),
        subtotal: z.number(),
        totalPrice: z.number(),
        externalUserName: z.string().optional(),
        externalUserEmail: z.string().optional(),
        externalUserCompany: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
         return createReservation({
           ...input,
           startTime: new Date(input.startTime),
           endTime: new Date(input.endTime),
           status: 'pending'
         });
      }),
    updateStatus: protectedProcedure
      .input(z.object({ id: z.number(), status: z.enum(['pending', 'confirmed', 'rejected', 'cancelled']) }))
      .mutation(async ({ input }) => updateReservationStatus(input.id, input.status)),
    checkAvailability: publicProcedure
      .input(z.object({ roomId: z.number(), startTime: z.string(), endTime: z.string() }))
      .query(async ({ input }) => {
        const existing = await checkAvailability(input.roomId, new Date(input.startTime), new Date(input.endTime));
        return { available: existing.length === 0 };
      }),
  }),
});

export type AppRouter = typeof appRouter;