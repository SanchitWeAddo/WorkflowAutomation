const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { PORT, NODE_ENV, CORS_ORIGINS } = require('./config/env');
const logger = require('./utils/logger');
const { initSocket } = require('./socket');
const { errorHandler } = require('./middleware/errorHandler');
const { apiLimiter, authLimiter } = require('./middleware/rateLimiter');

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
const app = express();

// ---------------------------------------------------------------------------
// Global middleware
// ---------------------------------------------------------------------------
app.use(helmet());
app.use(
  cors({
    origin: CORS_ORIGINS,
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(
  morgan(NODE_ENV === 'production' ? 'combined' : 'dev', {
    stream: { write: (msg) => logger.info(msg.trim()) },
  })
);

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------
app.use('/api/', apiLimiter);
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);

// ---------------------------------------------------------------------------
// API routes (v1)
// ---------------------------------------------------------------------------
app.use('/api/v1/auth', require('./routes/auth.routes'));
app.use('/api/v1/tasks', require('./routes/task.routes'));
app.use('/api/v1/projects', require('./routes/project.routes'));
app.use('/api/v1/users', require('./routes/user.routes'));
app.use('/api/v1/dashboard', require('./routes/dashboard.routes'));
app.use('/api/v1/notifications', require('./routes/notification.routes'));

// ---------------------------------------------------------------------------
// Serve frontend in production
// ---------------------------------------------------------------------------
if (NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '../../pih-frontend/dist');
  app.use(express.static(frontendDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  // 404 handler (dev only - frontend served by Vite in dev)
  app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });
}

// ---------------------------------------------------------------------------
// Global error handler (must be registered after all routes)
// ---------------------------------------------------------------------------
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------
const server = http.createServer(app);
initSocket(server);

server.listen(PORT, () => {
  logger.info(`PIH Backend running on port ${PORT} [${NODE_ENV}]`);
});

module.exports = app;
