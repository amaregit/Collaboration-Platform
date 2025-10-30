import pool from '../config/database';
import type { Project, ProjectMembership } from '../types';

export class ProjectModel {
  static async create(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    const query = `
      INSERT INTO projects (name, description, workspace_id)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const values = [projectData.name, projectData.description, projectData.workspaceId];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findById(id: string): Promise<Project | null> {
    const query = 'SELECT * FROM projects WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async findByWorkspaceId(workspaceId: string): Promise<Project[]> {
    const query = 'SELECT * FROM projects WHERE workspace_id = $1 ORDER BY created_at DESC';
    const result = await pool.query(query, [workspaceId]);
    return result.rows;
  }

  static async update(id: string, updates: Partial<Pick<Project, 'name' | 'description'>>): Promise<Project | null> {
    const query = `
      UPDATE projects
      SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    const result = await pool.query(query, [updates.name, updates.description, id]);
    return result.rows[0] || null;
  }

  static async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM projects WHERE id = $1';
    const result = await pool.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }
}

export class ProjectMembershipModel {
  static async create(membershipData: Omit<ProjectMembership, 'id' | 'joinedAt'>): Promise<ProjectMembership> {
    const query = `
      INSERT INTO project_memberships (project_id, user_id, role)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const values = [membershipData.projectId, membershipData.userId, membershipData.role];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByProjectId(projectId: string): Promise<ProjectMembership[]> {
    const query = `
      SELECT pm.*, u.email, u.first_name, u.last_name, u.global_status
      FROM project_memberships pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = $1
      ORDER BY pm.joined_at ASC
    `;
    const result = await pool.query(query, [projectId]);
    return result.rows;
  }

  static async findByUserId(userId: string): Promise<ProjectMembership[]> {
    const query = `
      SELECT pm.*, p.name as project_name, p.workspace_id
      FROM project_memberships pm
      JOIN projects p ON pm.project_id = p.id
      WHERE pm.user_id = $1
      ORDER BY pm.joined_at ASC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  static async findByProjectAndUser(projectId: string, userId: string): Promise<ProjectMembership | null> {
    const query = 'SELECT * FROM project_memberships WHERE project_id = $1 AND user_id = $2';
    const result = await pool.query(query, [projectId, userId]);
    return result.rows[0] || null;
  }

  static async updateRole(projectId: string, userId: string, role: 'PROJECT_LEAD' | 'CONTRIBUTOR' | 'PROJECT_VIEWER'): Promise<ProjectMembership | null> {
    const query = `
      UPDATE project_memberships
      SET role = $1
      WHERE project_id = $2 AND user_id = $3
      RETURNING *
    `;
    const result = await pool.query(query, [role, projectId, userId]);
    return result.rows[0] || null;
  }

  static async removeMember(projectId: string, userId: string): Promise<boolean> {
    const query = 'DELETE FROM project_memberships WHERE project_id = $1 AND user_id = $2';
    const result = await pool.query(query, [projectId, userId]);
    return (result.rowCount ?? 0) > 0;
  }

  static async isMember(projectId: string, userId: string): Promise<boolean> {
    const query = 'SELECT 1 FROM project_memberships WHERE project_id = $1 AND user_id = $2';
    const result = await pool.query(query, [projectId, userId]);
    return result.rows.length > 0;
  }

  static async getRole(projectId: string, userId: string): Promise<string | null> {
    const query = 'SELECT role FROM project_memberships WHERE project_id = $1 AND user_id = $2';
    const result = await pool.query(query, [projectId, userId]);
    return result.rows[0]?.role || null;
  }
}