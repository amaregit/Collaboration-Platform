import pool from '../config/database';
import type { Workspace, WorkspaceMember } from '../types';

export class WorkspaceModel {
  static async create(workspaceData: Omit<Workspace, 'id' | 'createdAt' | 'updatedAt'>): Promise<Workspace> {
    const query = `
      INSERT INTO workspaces (name, owner_id)
      VALUES ($1, $2)
      RETURNING *
    `;
    const values = [workspaceData.name, workspaceData.ownerId];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findById(id: string): Promise<Workspace | null> {
    const query = 'SELECT * FROM workspaces WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async findByOwnerId(ownerId: string): Promise<Workspace[]> {
    const query = 'SELECT * FROM workspaces WHERE owner_id = $1 ORDER BY created_at DESC';
    const result = await pool.query(query, [ownerId]);
    return result.rows;
  }

  static async findAll(): Promise<Workspace[]> {
    const query = 'SELECT * FROM workspaces ORDER BY created_at DESC';
    const result = await pool.query(query);
    return result.rows;
  }

  static async update(id: string, updates: Partial<Pick<Workspace, 'name'>>): Promise<Workspace | null> {
    const query = `
      UPDATE workspaces
      SET name = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [updates.name, id]);
    return result.rows[0] || null;
  }

  static async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM workspaces WHERE id = $1';
    const result = await pool.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }
}

export class WorkspaceMemberModel {
  static async create(memberData: Omit<WorkspaceMember, 'id' | 'joinedAt'>): Promise<WorkspaceMember> {
    const query = `
      INSERT INTO workspace_members (workspace_id, user_id, role)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const values = [memberData.workspaceId, memberData.userId, memberData.role];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByWorkspaceId(workspaceId: string): Promise<WorkspaceMember[]> {
    const query = `
      SELECT wm.*, u.email, u.first_name, u.last_name, u.global_status
      FROM workspace_members wm
      JOIN users u ON wm.user_id = u.id
      WHERE wm.workspace_id = $1
      ORDER BY wm.joined_at ASC
    `;
    const result = await pool.query(query, [workspaceId]);
    return result.rows;
  }

  static async findByUserId(userId: string): Promise<WorkspaceMember[]> {
    const query = `
      SELECT wm.*, w.name as workspace_name, w.owner_id
      FROM workspace_members wm
      JOIN workspaces w ON wm.workspace_id = w.id
      WHERE wm.user_id = $1
      ORDER BY wm.joined_at ASC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  static async findByWorkspaceAndUser(workspaceId: string, userId: string): Promise<WorkspaceMember | null> {
    const query = 'SELECT * FROM workspace_members WHERE workspace_id = $1 AND user_id = $2';
    const result = await pool.query(query, [workspaceId, userId]);
    return result.rows[0] || null;
  }

  static async updateRole(workspaceId: string, userId: string, role: 'OWNER' | 'MEMBER' | 'VIEWER'): Promise<WorkspaceMember | null> {
    const query = `
      UPDATE workspace_members
      SET role = $1
      WHERE workspace_id = $2 AND user_id = $3
      RETURNING *
    `;
    const result = await pool.query(query, [role, workspaceId, userId]);
    return result.rows[0] || null;
  }

  static async removeMember(workspaceId: string, userId: string): Promise<boolean> {
    const query = 'DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2';
    const result = await pool.query(query, [workspaceId, userId]);
    return (result.rowCount ?? 0) > 0;
  }

  static async isMember(workspaceId: string, userId: string): Promise<boolean> {
    const query = 'SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2';
    const result = await pool.query(query, [workspaceId, userId]);
    return result.rows.length > 0;
  }

  static async getRole(workspaceId: string, userId: string): Promise<string | null> {
    const query = 'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2';
    const result = await pool.query(query, [workspaceId, userId]);
    return result.rows[0]?.role || null;
  }
}