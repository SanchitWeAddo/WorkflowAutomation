const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/env');
const logger = require('../utils/logger');

const SALT_ROUNDS = 12;

/**
 * Generate a JWT token for the given user and org.
 */
function generateToken(userId, orgId) {
  return jwt.sign({ userId, orgId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Generate a refresh token with a longer expiry.
 */
function generateRefreshToken(userId, orgId) {
  return jwt.sign({ userId, orgId, type: 'refresh' }, JWT_SECRET, { expiresIn: '30d' });
}

/**
 * Register a new user. Optionally creates a new organization.
 *
 * @param {string}  email
 * @param {string}  password
 * @param {string}  name
 * @param {string}  [orgId]    - Existing org to join.
 * @param {string}  [orgName]  - New org name (creates org if provided).
 * @param {string}  [orgSlug]  - Slug for the new org.
 * @returns {{ user: object, token: string }}
 */
async function register(email, password, name, orgId, orgName, orgSlug) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const err = new Error('Email already registered');
    err.statusCode = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  let effectiveOrgId = orgId;

  // Create org if orgName is provided and no orgId given
  if (orgName && !orgId) {
    const slug = orgSlug || orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const existingOrg = await prisma.organization.findUnique({ where: { slug } });
    if (existingOrg) {
      const err = new Error('Organization slug already taken');
      err.statusCode = 409;
      throw err;
    }

    const org = await prisma.organization.create({
      data: { name: orgName, slug },
    });
    effectiveOrgId = org.id;
  }

  if (!effectiveOrgId) {
    const err = new Error('Either orgId or orgName must be provided');
    err.statusCode = 400;
    throw err;
  }

  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      orgId: effectiveOrgId,
      role: orgName ? 'ADMIN' : 'DEVELOPER', // Org creator gets ADMIN role
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      orgId: true,
      createdAt: true,
    },
  });

  const token = generateToken(user.id, user.orgId);

  logger.info('User registered', { userId: user.id, email, orgId: user.orgId });

  return { user, token };
}

/**
 * Authenticate a user with email and password.
 *
 * @param {string} email
 * @param {string} password
 * @returns {{ user: object, token: string, refreshToken: string }}
 */
async function login(email, password) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      orgId: true,
      avatarUrl: true,
      isActive: true,
      passwordHash: true,
      org: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!user || !user.passwordHash) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  if (!user.isActive) {
    const err = new Error('Account is deactivated');
    err.statusCode = 403;
    throw err;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  const token = generateToken(user.id, user.orgId);
  const refreshToken = generateRefreshToken(user.id, user.orgId);

  // Strip passwordHash from response
  const { passwordHash: _, ...safeUser } = user;

  logger.info('User logged in', { userId: user.id, email });

  return { user: safeUser, token, refreshToken };
}

/**
 * Retrieve the authenticated user's profile.
 *
 * @param {string} userId
 * @returns {object}
 */
async function getProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      skills: true,
      maxCapacity: true,
      velocity: true,
      avatarUrl: true,
      phone: true,
      slackId: true,
      isActive: true,
      createdAt: true,
      orgId: true,
      org: { select: { id: true, name: true, slug: true, planTier: true, logo: true } },
    },
  });

  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  return user;
}

module.exports = {
  register,
  login,
  generateToken,
  getProfile,
};
