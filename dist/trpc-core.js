import { initTRPC, TRPCError } from '@trpc/server';
import jwt from 'jsonwebtoken';
// Clé secrète (idéalement dans .env, fallback pour le développement)
const JWT_SECRET = process.env.JWT_SECRET || 'square-booking-super-secret-key-2026';
const t = initTRPC.context().create();
export const router = t.router;
export const publicProcedure = t.procedure;
const isAuthed = t.middleware(({ next, ctx }) => {
    const authHeader = ctx.req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token manquant' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return next({
            ctx: {
                user: decoded,
                req: ctx.req,
                res: ctx.res,
            },
        });
    }
    catch (err) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token invalide' });
    }
});
export const protectedProcedure = t.procedure.use(isAuthed);
