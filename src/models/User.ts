import pool from '../config/database';
import type { User } from '../types';

export class UserModel {
  static async create(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const query = `
      INSERT INTO users (email, password_hash, first_name, last_name, global_status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [
      userData.email,
      userData.passwordHash,
      userData.firstName,
      userData.lastName,
      userData.globalStatus
    ];

    const result = await pool.query(query, values);
    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      firstName: row.first_name,
      lastName: row.last_name,
      globalStatus: row.global_status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  static async findByEmail(email: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    if (!result.rows[0]) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      firstName: row.first_name,
      lastName: row.last_name,
      globalStatus: row.global_status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  static async findById(id: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    if (!result.rows[0]) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      firstName: row.first_name,
      lastName: row.last_name,
      globalStatus: row.global_status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  static async updateStatus(id: string, status: 'ACTIVE' | 'BANNED' | 'ADMIN'): Promise<User | null> {
    const query = `
      UPDATE users
      SET global_status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [status, id]);
    if (!result.rows[0]) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      firstName: row.first_name,
      lastName: row.last_name,
      globalStatus: row.global_status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  static async updatePassword(id: string, newPasswordHash: string): Promise<User | null> {
    const query = `
      UPDATE users
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [newPasswordHash, id]);
    if (!result.rows[0]) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      firstName: row.first_name,
      lastName: row.last_name,
      globalStatus: row.global_status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  static async findAll(): Promise<User[]> {
    const query = 'SELECT * FROM users ORDER BY created_at DESC';
    const result = await pool.query(query);
    return result.rows.map(row => ({
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      firstName: row.first_name,
      lastName: row.last_name,
      globalStatus: row.global_status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  static async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }
}