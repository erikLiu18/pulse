import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeDatabase } from './db/schema.js';
import { autoSeed } from './db/auto-seed.js';
import { startCronJobs } from './cron/push.js';
import profileRoutes from './routes/profiles.js';
import categoryRoutes from './routes/categories.js';
import entryRoutes from './routes/entries.js';
import statRoutes from './routes/stats.js';
import insightRoutes from './routes/insights.js';
import subcategoryRoutes from './routes/subcategories.js';
import pushRoutes from './routes/push.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT || '3001');

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/profiles', profileRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/entries', entryRoutes);
app.use('/api/stats', statRoutes);
app.use('/api/insights', insightRoutes);
app.use('/api/subcategories', subcategoryRoutes);
app.use('/api/push', pushRoutes);

// In production, serve the built React app
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

async function main() {
  await initializeDatabase();
  await autoSeed();
  
  startCronJobs();

  app.listen(PORT, () => {
    console.log(`Pulse API running on http://localhost:${PORT}`);
  });
}

main().catch(console.error);
