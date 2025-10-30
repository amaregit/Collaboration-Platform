import pool from '../config/database';
import type { Task } from '../types';

export class TaskModel {
  static async create(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const query = `
      INSERT INTO tasks (title, description, status, project_id, created_by_id, assigned_to_ids)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [
      taskData.title,
      taskData.description,
      taskData.status,
      taskData.projectId,
      taskData.createdById,
      taskData.assignedToIds
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findById(id: string): Promise<Task | null> {
    const query = 'SELECT * FROM tasks WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async findByProjectId(projectId: string): Promise<Task[]> {
    const query = 'SELECT * FROM tasks WHERE project_id = $1 ORDER BY created_at DESC';
    const result = await pool.query(query, [projectId]);
    return result.rows;
  }

  static async findByAssignedUser(userId: string): Promise<Task[]> {
    const query = 'SELECT * FROM tasks WHERE $1 = ANY(assigned_to_ids) ORDER BY created_at DESC';
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  static async update(id: string, updates: Partial<Pick<Task, 'title' | 'description' | 'status' | 'assignedToIds'>>): Promise<Task | null> {
    const query = `
      UPDATE tasks
      SET title = $1, description = $2, status = $3, assigned_to_ids = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `;
    const result = await pool.query(query, [
      updates.title,
      updates.description,
      updates.status,
      updates.assignedToIds,
      id
    ]);
    return result.rows[0] || null;
  }

  static async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM tasks WHERE id = $1';
    const result = await pool.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  static async updateStatus(id: string, status: 'TODO' | 'IN_PROGRESS' | 'DONE'): Promise<Task | null> {
    const query = `
      UPDATE tasks
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [status, id]);
    return result.rows[0] || null;
  }

  static async assignToUsers(id: string, userIds: string[]): Promise<Task | null> {
    const query = `
      UPDATE tasks
      SET assigned_to_ids = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [userIds, id]);
    return result.rows[0] || null;
  }

  static async findByWorkspaceId(workspaceId: string): Promise<Task[]> {
    const query = `
      SELECT t.* FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE p.workspace_id = $1
      ORDER BY t.updated_at DESC
    `;
    const result = await pool.query(query, [workspaceId]);
    return result.rows;
  }
}