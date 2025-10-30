import type { Request, Response, NextFunction } from 'express';
import { AuthUtils } from '../utils/auth';
import { UserModel } from '../models/User';
import { UserDeviceModel } from '../models/UserDevice';
import logger from '../utils/logger';
import type { JWTPayload } from '../types';

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      ipAddress?: string;
      userAgent?: string;
    }
  }
}

export class AuthMiddleware {
  static authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      const token = AuthUtils.extractTokenFromHeader(authHeader);

      if (!token) {
        res.status(401).json({ error: 'Access token required' });
        return;
      }

      const payload = AuthUtils.verifyAccessToken(token);
      if (!payload) {
        res.status(401).json({ error: 'Invalid or expired access token' });
        return;
      }

      // Check if user still exists and is active
      const user = await UserModel.findById(payload.userId);
      if (!user || user.globalStatus === 'BANNED') {
        res.status(401).json({ error: 'User account is banned or inactive' });
        return;
      }

      req.user = payload;
      req.ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      req.userAgent = req.get('User-Agent') || 'unknown';

      next();
    } catch (error) {
      logger.error('Authentication middleware error', undefined, req.ip, { error: error instanceof Error ? error.message : 'Unknown error' });
      res.status(500).json({ error: 'Authentication failed' });
    }
  };

  static authenticateRefreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const refreshToken = AuthUtils.extractRefreshTokenFromCookie(req.cookies);

      if (!refreshToken) {
        res.status(401).json({ error: 'Refresh token required' });
        return;
      }

      const device = await UserDeviceModel.findByRefreshToken(refreshToken);
      if (!device) {
        res.status(401).json({ error: 'Invalid refresh token' });
        return;
      }

      // Check if user still exists and is active
      const user = await UserModel.findById(device.userId);
      if (!user || user.globalStatus === 'BANNED') {
        res.status(401).json({ error: 'User account is banned or inactive' });
        return;
      }

      req.user = {
        userId: user.id,
        email: user.email,
        globalStatus: user.globalStatus
      };
      req.ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      req.userAgent = req.get('User-Agent') || 'unknown';

      next();
    } catch (error) {
      logger.error('Refresh token authentication error', undefined, req.ip, { error: error instanceof Error ? error.message : 'Unknown error' });
      res.status(500).json({ error: 'Refresh token authentication failed' });
    }
  };

  static requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || req.user.globalStatus !== 'ADMIN') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    next();
  };

  static requireActiveUser = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || req.user.globalStatus === 'BANNED') {
      res.status(403).json({ error: 'Active user account required' });
      return;
    }
    next();
  };
}