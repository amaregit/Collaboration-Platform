import pool from '../config/database';
import type { Notification } from '../types';

export class NotificationModel {
  static async create(notificationData: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> {
    const query = `
      INSERT INTO notifications (title, body, recipient_id, status, related_entity_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [
      notificationData.title,
      notificationData.body,
      notificationData.recipientId,
      notificationData.status,
      notificationData.relatedEntityId
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByRecipientId(recipientId: string): Promise<Notification[]> {
    const query = 'SELECT * FROM notifications WHERE recipient_id = $1 ORDER BY created_at DESC';
    const result = await pool.query(query, [recipientId]);
    return result.rows;
  }

  static async findById(id: string): Promise<Notification | null> {
    const query = 'SELECT * FROM notifications WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async markAsSeen(id: string): Promise<Notification | null> {
    const query = `
      UPDATE notifications
      SET status = 'SEEN'
      WHERE id = $1 AND status = 'DELIVERED'
      RETURNING *
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async markAllAsSeen(recipientId: string): Promise<number> {
    const query = `
      UPDATE notifications
      SET status = 'SEEN'
      WHERE recipient_id = $1 AND status = 'DELIVERED'
    `;
    const result = await pool.query(query, [recipientId]);
    return result.rowCount ?? 0;
  }

  static async getUnreadCount(recipientId: string): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM notifications WHERE recipient_id = $1 AND status = \'DELIVERED\'';
    const result = await pool.query(query, [recipientId]);
    return parseInt(result.rows[0].count, 10);
  }

  static async createTaskAssignmentNotifications(taskId: string, assignedUserIds: string[], taskTitle: string): Promise<void> {
    const notifications = assignedUserIds.map(userId => ({
      title: 'Task Assigned',
      body: `You have been assigned to task: "${taskTitle}"`,
      recipientId: userId,
      status: 'DELIVERED' as const,
      relatedEntityId: taskId
    }));

    if (notifications.length === 0) return;

    const values = notifications.flatMap(n => [n.title, n.body, n.recipientId, n.status, n.relatedEntityId]);
    const placeholders = notifications.map((_, i) =>
      `($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5})`
    ).join(', ');

    const query = `INSERT INTO notifications (title, body, recipient_id, status, related_entity_id) VALUES ${placeholders}`;
    await pool.query(query, values);
  }

  static async deleteByRelatedEntityId(entityId: string): Promise<void> {
    const query = 'DELETE FROM notifications WHERE related_entity_id = $1';
    await pool.query(query, [entityId]);
  }
}