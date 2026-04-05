import { z } from "zod";
import { TRPCError } from "@trpc/server";
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
  updateReservationStatus,
  deleteReservation,
  createOrGetExternalUser,
  getUserQuota,
  createOrUpdateUserQuota,
  updateRoom,
  getReservationsForCalendar,
  addReservationOption,
} from "./db.js";

export const appRouter = router({

  // ─── Système ───────────────────────────────────────────────────────────────
  system: router({
    health: publicProcedure.query(() => ({ status: 'ok', timestamp: new Date().toISOString() })),
  }),

  // ─── Auth ──────────────────────────────────────────────────────────────────
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user || null),
    logout: publicProcedure.mutation(() => ({ success: true })),
  }),

  // ─── Salles ────────────────────────────────────────────────────────────────
  rooms: router({
    list: publicProcedure.query(async () => getRooms()),
    getById: publicProcedure.input(z.number()).query(async ({ input }) => getRoomById(input)),
  }),

  // ─── Configurations de salle ───────────────────────────────────────────────
  roomSetups: router({
    list: publicProcedure.query(async () => getRoomSetups()),
  }),

  // ─── Options supplémentaires ───────────────────────────────────────────────
  options: router({
    list: publicProcedure.query(async () => getAdditionalOptions()),
    update: protectedProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), price: z.number().optional() }))
      .mutation(async ({ input }) => updateAdditionalOption(input.id, input)),
  }),

  // ─── Tarifs ────────────────────────────────────────────────────────────────
  pricing: router({
    updateRoom: protectedProcedure
      .input(z.object({
        roomId: z.number(),
        pricePerHour: z.number().optional(),
        priceHalfDay: z.number().optional(),
        priceFullDay: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Réservé aux administrateurs' });
        const { roomId, ...prices } = input;
        return updateRoom(roomId, {
          pricePerHour: prices.pricePerHour?.toString(),
          priceHalfDay: prices.priceHalfDay?.toString(),
          priceFullDay: prices.priceFullDay?.toString(),
        });
      }),
  }),

  // ─── Quotas ────────────────────────────────────────────────────────────────
  quotas: router({
    setUserQuota: protectedProcedure
      .input(z.object({ userId: z.number(), quotaHours: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Réservé aux administrateurs' });
        return createOrUpdateUserQuota(input.userId, new Date().getFullYear(), input.quotaHours);
      }),
    getMyQuota: protectedProcedure
      .query(async ({ ctx }) => getUserQuota(ctx.user.id, new Date().getFullYear())),
  }),

  // ─── Calendrier ────────────────────────────────────────────────────────────
  calendar: router({
    getReservations: publicProcedure
      .input(z.object({ startDate: z.string(), endDate: z.string() }))
      .query(async ({ input }) =>
        getReservationsForCalendar(new Date(input.startDate), new Date(input.endDate))
      ),
  }),

  // ─── Réservations ──────────────────────────────────────────────────────────
  reservations: router({

    list: protectedProcedure
      .query(async ({ ctx }) => getReservationsByUser(ctx.user.id)),

    getPending: protectedProcedure
      .query(async () => getPendingReservations()),

    checkAvailability: publicProcedure
      .input(z.object({ roomId: z.number(), startTime: z.string(), endTime: z.string() }))
      .query(async ({ input }) => {
        // Gestion des conflits de salles combinées :
        // Grande Salle (id=3) = Salle 1 + Salle 2 → vérifier les trois
        const roomsToCheck: number[] = [input.roomId];
        if (input.roomId === 3) {
          roomsToCheck.push(1, 2);
        } else if (input.roomId === 1 || input.roomId === 2) {
          roomsToCheck.push(3);
        }

        const allConflicts = await Promise.all(
          roomsToCheck.map(id =>
            checkAvailability(id, new Date(input.startTime), new Date(input.endTime))
          )
        );
        const conflicts = allConflicts.flat();
        return { available: conflicts.length === 0, conflicts };
      }),

    create: publicProcedure
      .input(z.object({
        roomId: z.number(),
        startTime: z.string(),
        endTime: z.string(),
        duration: z.number(),
        pricePerUnit: z.number(),         // Conservé pour compatibilité type frontend
        subtotal: z.number(),             // Conservé pour compatibilité type frontend
        eveningSupplement: z.number().default(0),
        saturdaySupplement: z.number().default(0),
        beveragePackage: z.boolean().default(false),
        beverageCount: z.number().default(0),
        beveragePrice: z.number().default(0),
        totalPrice: z.number(),           // Ignoré — recalculé côté serveur
        setupId: z.number().optional(),
        selectedOptions: z.array(z.object({
          optionId: z.number(),
          quantity: z.number(),
          price: z.number(),
        })).default([]),
        externalUserName: z.string().optional(),
        externalUserEmail: z.string().email().optional(),
        externalUserAddress: z.string().optional(),
        externalUserCompany: z.string().optional(),
        externalUserVatNumber: z.string().optional(),
        externalUserPhone: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {

        // Validation : utilisateur externe doit fournir un email
        if (!ctx.user && !input.externalUserEmail) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Email requis pour les utilisateurs externes',
          });
        }

        // Création ou récupération de l'utilisateur externe
        let externalUserId: number | undefined;
        if (!ctx.user && input.externalUserEmail) {
          const externalUser = await createOrGetExternalUser({
            name: input.externalUserName || 'Inconnu',
            email: input.externalUserEmail,
            phone: input.externalUserPhone,
            company: input.externalUserCompany,
            vatNumber: input.externalUserVatNumber,
            address: input.externalUserAddress,
          });
          externalUserId = externalUser.id;
        }

        // ── Recalcul du prix côté serveur (sécurité) ──────────────────────
        const room = await getRoomById(input.roomId);
        if (!room) throw new TRPCError({ code: 'NOT_FOUND', message: 'Salle introuvable' });

        const startTime = new Date(input.startTime);
        const endTime = new Date(input.endTime);
        const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

        if (durationHours <= 0) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'La durée doit être positive' });
        }

        const pricePerHour = parseFloat(room.pricePerHour);
        const priceHalfDay = parseFloat(room.priceHalfDay);
        const priceFullDay = parseFloat(room.priceFullDay);

        // Tarif de base : le plus avantageux entre horaire, demi-journée, journée
        let basePrice = pricePerHour * durationHours;
        if (durationHours > 1 && priceHalfDay < basePrice) basePrice = priceHalfDay;
        if (durationHours > 4 && priceFullDay < basePrice) basePrice = priceFullDay;

        // Supplément soirée : +25% sur la portion après 18h
        const eveningStartTime = new Date(startTime);
        eveningStartTime.setHours(18, 0, 0, 0);
        let eveningDuration = 0;
        if (endTime > eveningStartTime) {
          const effectiveStart = startTime > eveningStartTime ? startTime : eveningStartTime;
          eveningDuration = (endTime.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60);
        }
        const regularDuration = Math.max(0, durationHours - eveningDuration);
        if (durationHours > 0) {
          const eveningRatio = eveningDuration / durationHours;
          const regularRatio = regularDuration / durationHours;
          basePrice = (basePrice * regularRatio) + (basePrice * eveningRatio * 1.25);
        }
        const eveningSupplementAmount = eveningDuration > 0 ? (basePrice - (basePrice / 1.25 * regularDuration / durationHours + basePrice * regularDuration / durationHours)) : 0;

        // Supplément samedi : +50%
        const isSaturday = startTime.getDay() === 6;
        const basePriceBeforeSaturday = basePrice;
        if (isSaturday) basePrice *= 1.5;
        const saturdaySupplementAmount = isSaturday ? basePrice - basePriceBeforeSaturday : 0;

        // Forfait boisson
        const beverageUnitPrice = durationHours > 5 ? 12.0 : 6.5;
        const serverBeveragePrice = input.beveragePackage && durationHours > 0
          ? beverageUnitPrice * input.beverageCount
          : 0;

        const serverTotalPrice = basePrice + serverBeveragePrice;

        // ── Création de la réservation ─────────────────────────────────────
        const reservation = await createReservation({
          roomId: input.roomId,
          internalUserId: ctx.user?.id || null,
          externalUserId: externalUserId || null,
          startTime,
          endTime,
          duration: durationHours.toString(),
          status: ctx.user ? 'confirmed' : 'pending',
          pricePerUnit: pricePerHour.toString(),
          subtotal: basePrice.toString(),
          eveningSupplement: eveningSupplementAmount.toString(),
          saturdaySupplement: saturdaySupplementAmount.toString(),
          beveragePackage: input.beveragePackage,
          beverageCount: input.beverageCount,
          beveragePrice: serverBeveragePrice.toString(),
          totalPrice: serverTotalPrice.toString(),
          setupId: input.setupId || null,
        });

        // Options supplémentaires
        if (input.selectedOptions && input.selectedOptions.length > 0) {
          await Promise.all(
            input.selectedOptions.map(opt =>
              addReservationOption(reservation.id, opt.optionId, opt.quantity, opt.price)
            )
          );
        }

        return reservation;
      }),

    updateStatus: protectedProcedure
      .input(z.object({ id: z.number(), status: z.enum(['pending', 'confirmed', 'rejected', 'cancelled']) }))
      .mutation(async ({ input }) => updateReservationStatus(input.id, input.status)),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Réservé aux administrateurs' });
        return deleteReservation(input.id);
      }),

  }),
});

export type AppRouter = typeof appRouter;