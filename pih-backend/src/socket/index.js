const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, CORS_ORIGINS } = require('../config/env');
const logger = require('../utils/logger');

let io;

/**
 * Initialize Socket.io on the given HTTP server.
 *
 * - Configures CORS from env
 * - Authenticates connections via JWT in handshake auth
 * - Joins each socket to user-specific and org-specific rooms
 *
 * @param {import('http').Server} server - The HTTP server instance.
 * @returns {import('socket.io').Server} The Socket.io server instance.
 */
function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: CORS_ORIGINS,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // JWT authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.userId;
      socket.orgId = decoded.orgId;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.userId}`);

    // Join personal room and org room for targeted events
    socket.join(socket.userId);
    socket.join(`org:${socket.orgId}`);

    socket.on('join:task', (taskId) => {
      socket.join(`task:${taskId}`);
    });

    socket.on('leave:task', (taskId) => {
      socket.leave(`task:${taskId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.userId}`);
    });
  });

  return io;
}

/**
 * Get the initialized Socket.io instance.
 *
 * @returns {import('socket.io').Server}
 * @throws {Error} If Socket.io has not been initialized yet.
 */
function getIO() {
  if (!io) {
    throw new Error('Socket.io not initialized. Call initSocket(server) first.');
  }
  return io;
}

module.exports = { initSocket, getIO };
