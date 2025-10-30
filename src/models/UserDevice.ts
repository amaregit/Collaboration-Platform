import pool from '../config/database';
import type { UserDevice } from '../types';

export class UserDeviceModel {
  static async create(deviceData: Omit<UserDevice, 'id' | 'loginTime'>): Promise<UserDevice> {
    const query = `
      INSERT INTO user_devices (user_id, refresh_token, ip_address, user_agent, is_revoked)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [
      deviceData.userId,
      deviceData.refreshToken,
      deviceData.ipAddress,
      deviceData.userAgent,
      deviceData.isRevoked
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByRefreshToken(refreshToken: string): Promise<UserDevice | null> {
    const query = 'SELECT * FROM user_devices WHERE refresh_token = $1 AND is_revoked = FALSE';
    const result = await pool.query(query, [refreshToken]);
    return result.rows[0] || null;
  }

  static async findByUserId(userId: string): Promise<UserDevice[]> {
    const query = 'SELECT * FROM user_devices WHERE user_id = $1 AND is_revoked = FALSE ORDER BY login_time DESC';
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  static async revokeToken(refreshToken: string): Promise<boolean> {
    const query = 'UPDATE user_devices SET is_revoked = TRUE WHERE refresh_token = $1';
    const result = await pool.query(query, [refreshToken]);
    return (result.rowCount ?? 0) > 0;
  }

  static async revokeAllUserTokens(userId: string): Promise<boolean> {
    const query = 'UPDATE user_devices SET is_revoked = TRUE WHERE user_id = $1';
    const result = await pool.query(query, [userId]);
    return (result.rowCount ?? 0) > 0;
  }

  static async cleanupExpiredTokens(): Promise<void> {
    // Remove tokens older than 30 days
    const query = 'DELETE FROM user_devices WHERE login_time < NOW() - INTERVAL \'30 days\'';
    await pool.query(query);
  }
}