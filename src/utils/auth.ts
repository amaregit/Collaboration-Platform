import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import type { JWTPayload, AuthPayload } from '../types';

export class AuthUtils {
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, process.env.JWT_ACCESS_SECRET!, {
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m'
    } as jwt.SignOptions);
  }

  static generateRefreshToken(): string {
    return uuidv4();
  }

  static verifyAccessToken(token: string): JWTPayload | null {
    try {
      return jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as JWTPayload;
    } catch {
      return null;
    }
  }

  static verifyRefreshToken(token: string): boolean {
    // For simplicity, we'll store refresh tokens in DB and verify there
    // In production, you might want to use JWT for refresh tokens too
    return token.length === 36; // UUID v4 length
  }

  static generateAuthPayload(userId: string, email: string, globalStatus: string): AuthPayload {
    const accessToken = this.generateAccessToken({ userId, email, globalStatus });
    const refreshToken = this.generateRefreshToken();

    return { accessToken, refreshToken };
  }

  static extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  static extractRefreshTokenFromCookie(cookies: any): string | null {
    return cookies?.refreshToken || null;
  }
}