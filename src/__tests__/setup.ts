import { jest } from '@jest/globals';
import pool from '../config/database';

// Set test environment
(process.env as any).NODE_ENV = 'test';
(process.env as any).JWT_ACCESS_SECRET = 'test-access-secret';
(process.env as any).JWT_REFRESH_SECRET = 'test-refresh-secret';
(process.env as any).DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';

// Mock logger to avoid file writes during tests
jest.mock('../utils/logger', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    security: jest.fn(),
    log: jest.fn(),
  },
}));

// Clean up database before each test
beforeEach(async () => {
  try {
    // Clear all tables in correct order (respecting foreign keys)
    await pool.query('DELETE FROM notifications');
    await pool.query('DELETE FROM tasks');
    await pool.query('DELETE FROM project_memberships');
    await pool.query('DELETE FROM projects');
    await pool.query('DELETE FROM workspace_members');
    await pool.query('DELETE FROM workspaces');
    await pool.query('DELETE FROM user_devices');
    await pool.query('DELETE FROM users');
    await pool.query('DELETE FROM audit_logs');
  } catch (error) {
    console.error('Error cleaning up test database:', error);
  }
});

// Close database connection after all tests
afterAll(async () => {
  await pool.end();
});