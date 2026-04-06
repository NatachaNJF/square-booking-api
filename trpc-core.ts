import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';
import jwt from 'jsonwebtoken';

// Clé secrète (idéalement dans .env, fallback pour le développement)
const JWT_SECRET = process.env.JWT_SECRET || 'square-booking-super-secret-key-2026';

export type Context = {
  req: any;
  res: any;
  user?: any; // Optionnel car l'utilisateur n'est présent qu'après le middleware isAuthed
};

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

const isAuthed = t.middleware(({ next, ctx }) => {
  const authHeader = ctx.req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token manquant' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return next({
      ctx: {
        user: decoded,
        req: ctx.req,
        res: ctx.res,
      },
    });
  } catch (err) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token invalide' });
  }
});

export const protectedProcedure = t.procedure.use(isAuthed);
