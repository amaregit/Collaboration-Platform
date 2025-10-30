import express from 'express';
import Joi from 'joi';
import { AuthUtils } from '../utils/auth';
import { UserModel } from '../models/User';
import { UserDeviceModel } from '../models/UserDevice';
import { AuthMiddleware } from '../middleware/auth';
import logger from '../utils/logger';

const router = express.Router();

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  firstName: Joi.string().min(1).required(),
  lastName: Joi.string().min(1).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required()
});

const updatePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).required()
});

// Register endpoint (GraphQL handles this, but keeping REST for compatibility)
router.post('/register', async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details?.[0]?.message || 'Validation error' });
    }

    const { email, password, firstName, lastName } = value;

    // Check if user already exists
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Validate password input
    if (typeof password !== 'string' || password.length === 0) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    // Hash password
    const passwordHash = await AuthUtils.hashPassword(password);

    // Create user
    const user = await UserModel.create({
      email,
      passwordHash,
      firstName,
      lastName,
      globalStatus: 'ACTIVE'
    });

    logger.info('USER_REGISTERED', user.id, req.ip, { email });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (error) {
    logger.error('Registration failed', undefined, req.ip, { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details?.[0]?.message || 'Validation error' });
    }

    const { email, password } = value;

    // Validate password input
    if (typeof password !== 'string' || password.length === 0) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    // Find user
    const user = await UserModel.findByEmail(email);
    if (!user) {
      logger.warn('LOGIN_FAILURE', undefined, req.ip, { email, reason: 'User not found' });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user data is valid
    if (!user.passwordHash) {
      logger.error('Login failed - corrupted user account', undefined, req.ip, { email, userId: user.id });
      return res.status(500).json({ error: 'Login failed' });
    }

    // Check if user is banned
    if (user.globalStatus === 'BANNED') {
      logger.security('LOGIN_FAILURE_BANNED_USER', undefined, req.ip, { email, userId: user.id });
      return res.status(403).json({ error: 'Account is banned' });
    }

    // Verify password
    const isValidPassword = await AuthUtils.verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      logger.warn('LOGIN_FAILURE', undefined, req.ip, { email, reason: 'Invalid password' });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const { accessToken, refreshToken } = AuthUtils.generateAuthPayload(user.id, user.email, user.globalStatus);

    // Store device info
    await UserDeviceModel.create({
      userId: user.id,
      refreshToken,
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      isRevoked: false
    });

    logger.info('LOGIN_SUCCESS', user.id, req.ip, { email });

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        globalStatus: user.globalStatus
      }
    });
  } catch (error) {
    logger.error('Login failed', undefined, req.ip, { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout endpoint
router.post('/logout', AuthMiddleware.authenticateRefreshToken, async (req, res) => {
  try {
    const refreshToken = AuthUtils.extractRefreshTokenFromCookie(req.cookies);

    if (refreshToken) {
      await UserDeviceModel.revokeToken(refreshToken);
      logger.info('LOGOUT_SUCCESS', req.user?.userId, req.ip);
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout failed', req.user?.userId, req.ip, { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Refresh token endpoint
router.post('/refresh', AuthMiddleware.authenticateRefreshToken, async (req, res) => {
  try {
    const user = req.user!;
    const { accessToken, refreshToken: newRefreshToken } = AuthUtils.generateAuthPayload(user.userId, user.email, user.globalStatus);

    // Revoke old refresh token and create new one
    const oldRefreshToken = AuthUtils.extractRefreshTokenFromCookie(req.cookies);
    if (oldRefreshToken) {
      await UserDeviceModel.revokeToken(oldRefreshToken);
    }

    // Store new device info
    await UserDeviceModel.create({
      userId: user.userId,
      refreshToken: newRefreshToken,
      ipAddress: req.ipAddress!,
      userAgent: req.userAgent!,
      isRevoked: false
    });

    logger.info('TOKEN_REFRESHED', user.userId, req.ip);

    // Set new refresh token cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({ accessToken });
  } catch (error) {
    logger.error('Token refresh failed', req.user?.userId, req.ip, { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// Update password endpoint (for authenticated users)
router.post('/update-password', AuthMiddleware.authenticateToken, async (req, res) => {
  try {
    const { error, value } = updatePasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details?.[0]?.message || 'Validation error' });
    }

    const { currentPassword, newPassword } = value;
    const userId = req.user!.userId;

    // Validate current password input
    if (typeof currentPassword !== 'string' || currentPassword.length === 0) {
      return res.status(400).json({ error: 'Invalid current password' });
    }

    // Get user
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user data is valid
    if (!user.passwordHash) {
      logger.error('Password update failed - corrupted user account', userId, req.ip, { userId });
      return res.status(500).json({ error: 'Password update failed' });
    }

    // Verify current password
    const isValidPassword = await AuthUtils.verifyPassword(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Validate new password input
    if (typeof newPassword !== 'string' || newPassword.length === 0) {
      return res.status(400).json({ error: 'Invalid new password' });
    }

    // Hash new password
    const newPasswordHash = await AuthUtils.hashPassword(newPassword);

    // Update password
    await UserModel.updatePassword(userId, newPasswordHash);

    // Revoke all refresh tokens for security
    await UserDeviceModel.revokeAllUserTokens(userId);

    logger.security('PASSWORD_UPDATED', userId, req.ip);

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    logger.error('Password update failed', req.user?.userId, req.ip, { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({ error: 'Password update failed' });
  }
});

export default router;