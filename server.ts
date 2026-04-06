import express from 'express';
import cors from 'cors';
import * as trpcExpress from '@trpc/server/adapters/express';
import { appRouter } from './routers.js';
import { Context } from './trpc-core.js';
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
    createContext: ({ req, res }): Context => {
      return {
        req,
        res
      };
    },
  }),
);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend Square is running!' });
});


app.listen(Number(port), "0.0.0.0", () => {
  console.log(`[Backend] Serveur démarré sur le port ${port} (toutes interfaces)`);
  console.log(`[Backend] API tRPC disponible sur port ${port}/trpc`);
});
