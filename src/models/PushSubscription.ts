import pool from '../config/database';
import type { PushSubscription } from '../types';

export class PushSubscriptionModel {
  static async create(subscriptionData: Omit<PushSubscription, 'id' | 'createdAt'>): Promise<PushSubscription> {
    const query = `
      INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, endpoint) DO UPDATE SET
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        user_agent = EXCLUDED.user_agent
      RETURNING *
    `;
    const values = [
      subscriptionData.userId,
      subscriptionData.endpoint,
      subscriptionData.p256dh,
      subscriptionData.auth,
      subscriptionData.userAgent
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByUserId(userId: string): Promise<PushSubscription[]> {
    const query = 'SELECT * FROM push_subscriptions WHERE user_id = $1 ORDER BY created_at DESC';
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  static async delete(userId: string, endpoint: string): Promise<boolean> {
    const query = 'DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2';
    const result = await pool.query(query, [userId, endpoint]);
    return (result.rowCount ?? 0) > 0;
  }

  static async deleteAllUserSubscriptions(userId: string): Promise<boolean> {
    const query = 'DELETE FROM push_subscriptions WHERE user_id = $1';
    const result = await pool.query(query, [userId]);
    return (result.rowCount ?? 0) > 0;
  }
}