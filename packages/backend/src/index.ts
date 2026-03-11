import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth.js';
import { vocabularyRouter } from './routes/vocabulary.js';
import { generateRouter } from './routes/generate.js';
import { textsRouter } from './routes/texts.js';
import { translateRouter } from './routes/translate.js';
import { statsRouter } from './routes/stats.js';
import { settingsRouter } from './routes/settings.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3009;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/vocabulary', vocabularyRouter);
app.use('/api/generate', generateRouter);
app.use('/api/texts', textsRouter);
app.use('/api/translate', translateRouter);
app.use('/api/stats', statsRouter);
app.use('/api/settings', settingsRouter);

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Duopara API server running on http://localhost:${PORT}`);
});
