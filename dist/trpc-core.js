import { initTRPC, TRPCError } from '@trpc/server';
const t = initTRPC.context().create();
export const router = t.router;
export const publicProcedure = t.procedure;
// Middleware d'authentification simplifié
const isAuthed = t.middleware(({ next, ctx }) => {
    if (!ctx.user) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
    return next({
        ctx: {
            user: ctx.user,
        },
    });
});
export const protectedProcedure = t.procedure.use(isAuthed);
