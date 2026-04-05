import express from 'express';
import cors from 'cors';
import * as trpcExpress from '@trpc/server/adapters/express';
import { appRouter } from './routers.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Autoriser les requêtes depuis Netlify
app.use(cors({
  origin: true, // Autoriser tout le monde en Dev, à affiner après
  credentials: true,
}));

// Adapter tRPC pour Express
app.use(
  '/trpc',
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext: ({ req, res }) => {
      // Pour l'instant on mocke l'utilisateur en tant qu'admin pour simplifier le test
      // TODO: Réintégrer l'auth réelle une fois la DB en ligne
      return {
        user: { id: 1, role: 'admin', name: 'Admin local' },
        req,
        res
      };
    },
  }),
);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend Square is running!' });
});

app.listen(port, () => {
  console.log(`[Backend] Serveur démarré sur http://localhost:${port}`);
  console.log(`[Backend] API tRPC disponible sur http://localhost:${port}/trpc`);
});
