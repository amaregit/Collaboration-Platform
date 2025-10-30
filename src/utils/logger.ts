import winston from 'winston';
import path from 'path';
import pool from '../config/database';

export enum LogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  SECURITY = 'security'
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  userId?: string;
  ipAddress?: string;
  action: string;
  details?: Record<string, any>;
}

class Logger {
  private winstonLogger: winston.Logger;

  constructor() {
    this.winstonLogger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({
          filename: path.join(process.cwd(), process.env.LOG_FILE || 'logs/audit.log')
        }),
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });
  }

  private async saveToDatabase(entry: LogEntry): Promise<void> {
    try {
      const query = `
        INSERT INTO audit_logs (timestamp, level, user_id, ip_address, action, details)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;
      const values = [
        entry.timestamp,
        entry.level,
        entry.userId || null,
        entry.ipAddress || null,
        entry.action,
        entry.details ? JSON.stringify(entry.details) : null
      ];

      await pool.query(query, values);
    } catch (error) {
      console.error('Failed to save log to database:', error);
    }
  }

  async log(entry: LogEntry): Promise<void> {
    // Log to file
    this.winstonLogger.log(entry.level, entry.action, {
      userId: entry.userId,
      ipAddress: entry.ipAddress,
      details: entry.details,
      timestamp: entry.timestamp
    });

    // Log to database for security-sensitive events
    if ([LogLevel.SECURITY, LogLevel.ERROR].includes(entry.level) ||
        entry.action.includes('LOGIN') ||
        entry.action.includes('ADMIN') ||
        entry.action.includes('TASK_STATUS') ||
        entry.action.includes('USER_BANNED')) {
      await this.saveToDatabase(entry);
    }
  }

  async info(action: string, userId?: string, ipAddress?: string, details?: Record<string, any>): Promise<void> {
    await this.log({
      timestamp: new Date(),
      level: LogLevel.INFO,
      userId,
      ipAddress,
      action,
      details
    });
  }

  async warn(action: string, userId?: string, ipAddress?: string, details?: Record<string, any>): Promise<void> {
    await this.log({
      timestamp: new Date(),
      level: LogLevel.WARN,
      userId,
      ipAddress,
      action,
      details
    });
  }

  async error(action: string, userId?: string, ipAddress?: string, details?: Record<string, any>): Promise<void> {
    await this.log({
      timestamp: new Date(),
      level: LogLevel.ERROR,
      userId,
      ipAddress,
      action,
      details
    });
  }

  async security(action: string, userId?: string, ipAddress?: string, details?: Record<string, any>): Promise<void> {
    await this.log({
      timestamp: new Date(),
      level: LogLevel.SECURITY,
      userId,
      ipAddress,
      action,
      details
    });
  }
}

export default new Logger();