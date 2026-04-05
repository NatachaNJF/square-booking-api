import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';

// Contexte minimal pour tRPC
export type Context = {
  user?: { id: number; role: string; name: string };
  req: any;
  res: any;
};

const t = initTRPC.context<Context>().create();

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
