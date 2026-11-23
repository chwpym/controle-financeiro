import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';

import adminRouter from './server/routes/admin';
import authRouter from './server/routes/auth';
import backupRouter from './server/routes/backup';
import bootstrapRouter from './server/routes/bootstrap';
import categoryRouter from './server/routes/categories';
import companyRouter from './server/routes/companies';
import contactRouter from './server/routes/contacts';
import transactionRouter from './server/routes/transactions';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production' || process.argv.includes('--prod') || process.argv.includes('--preview');

const app = express();
app.use(express.json({ limit: '10mb' }));

// API Routers
app.use('/api/auth', authRouter);
app.use('/api', bootstrapRouter);
app.use('/api/transactions', transactionRouter);
app.use('/api/contacts', contactRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/companies', companyRouter);
app.use('/api/backup', backupRouter);
app.use('/api/admin', adminRouter);

async function startServer() {
  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[MODO DESENVOLVIMENTO] Vite HMR ativo');
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (!fs.existsSync(distPath)) {
      console.error("\n[ERRO CRÍTICO] Pasta 'dist' não encontrada!\nExecute 'npm run build' antes de iniciar o modo de produção/preview.\n");
      process.exit(1);
    }
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/@') || /\.[a-zA-Z0-9]+$/.test(req.path)) {
        res.status(404).end();
        return;
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log(`[MODO PRODUÇÃO / PWA OFFLINE] Servindo aplicação empacotada de: ${distPath}`);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FluxoClaro rodando em: http://localhost:${PORT}`);
  });
}

startServer();
