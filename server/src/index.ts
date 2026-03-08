import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeDatabase } from './db/schema.js';
import profileRoutes from './routes/profiles.js';
import categoryRoutes from './routes/categories.js';
import entryRoutes from './routes/entries.js';
import statRoutes from './routes/stats.js';
import insightRoutes from './routes/insights.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT || '3001');

app.use(cors());
app.use(express.json());

// Initialize DB on startup
initializeDatabase();

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

// In production, serve the built React app
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Pulse API running on http://localhost:${PORT}`);
});
