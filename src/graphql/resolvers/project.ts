import { ProjectModel, ProjectMembershipModel } from '../../models/Project';
import { WorkspaceMemberModel } from '../../models/Workspace';
import { UserModel } from '../../models/User';
import logger from '../../utils/logger';
import type { Context } from '../../types';

export const projectResolvers = {
  Query: {
    getProject: async (_: any, { id }: any, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const project = await ProjectModel.findById(id);
      if (!project) {
        throw new Error('Project not found');
      }

      // Check if user is a member of the parent workspace
      const workspaceMembership = await WorkspaceMemberModel.findByWorkspaceAndUser(project.workspaceId, context.user.userId);
      if (!workspaceMembership) {
        throw new Error('Access denied: Not a member of the parent workspace');
      }

      // If user is only a VIEWER in workspace, check project membership
      if (workspaceMembership.role === 'VIEWER') {
        const projectMembership = await ProjectMembershipModel.findByProjectAndUser(id, context.user.userId);
        if (!projectMembership) {
          throw new Error('Access denied: Not a member of this project');
        }
      }

      return project;
    },

    getProjects: async (_: any, { workspaceId }: any, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Check if user is a member of the workspace
      const workspaceMembership = await WorkspaceMemberModel.findByWorkspaceAndUser(workspaceId, context.user.userId);
      if (!workspaceMembership) {
        throw new Error('Access denied: Not a member of this workspace');
      }

      return await ProjectModel.findByWorkspaceId(workspaceId);
    },
  },

  Mutation: {
    createProject: async (_: any, { workspaceId, name, description }: any, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Check if user is a member of the workspace with sufficient permissions
      const workspaceMembership = await WorkspaceMemberModel.findByWorkspaceAndUser(workspaceId, context.user.userId);
      if (!workspaceMembership) {
        throw new Error('Access denied: Not a member of this workspace');
      }

      // Only workspace members and owners can create projects
      if (!['OWNER', 'MEMBER'].includes(workspaceMembership.role)) {
        throw new Error('Access denied: Insufficient permissions to create projects');
      }

      const project = await ProjectModel.create({
        name,
        description,
        workspaceId
      });

      logger.info('PROJECT_CREATED', context.user.userId, context.ipAddress, {
        projectId: project.id,
        workspaceId
      });

      return project;
    },

    updateProject: async (_: any, { id, name, description }: any, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const project = await ProjectModel.findById(id);
      if (!project) {
        throw new Error('Project not found');
      }

      // Check workspace membership
      const workspaceMembership = await WorkspaceMemberModel.findByWorkspaceAndUser(project.workspaceId, context.user.userId);
      if (!workspaceMembership) {
        throw new Error('Access denied: Not a member of the parent workspace');
      }

      // Check permissions - workspace owners/members or project leads can update
      let hasPermission = ['OWNER', 'MEMBER'].includes(workspaceMembership.role);
      if (!hasPermission) {
        const projectMembership = await ProjectMembershipModel.findByProjectAndUser(id, context.user.userId);
        hasPermission = projectMembership?.role === 'PROJECT_LEAD';
      }

      if (!hasPermission) {
        throw new Error('Access denied: Insufficient permissions to update project');
      }

      const updatedProject = await ProjectModel.update(id, { name, description });
      if (!updatedProject) {
        throw new Error('Failed to update project');
      }

      logger.info('PROJECT_UPDATED', context.user.userId, context.ipAddress, { projectId: id });

      return updatedProject;
    },

    deleteProject: async (_: any, { id }: any, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const project = await ProjectModel.findById(id);
      if (!project) {
        throw new Error('Project not found');
      }

      // Check workspace membership
      const workspaceMembership = await WorkspaceMemberModel.findByWorkspaceAndUser(project.workspaceId, context.user.userId);
      if (!workspaceMembership) {
        throw new Error('Access denied: Not a member of the parent workspace');
      }

      // Check permissions - workspace owners or project leads can delete
      let hasPermission = workspaceMembership.role === 'OWNER';
      if (!hasPermission) {
        const projectMembership = await ProjectMembershipModel.findByProjectAndUser(id, context.user.userId);
        hasPermission = projectMembership?.role === 'PROJECT_LEAD';
      }

      if (!hasPermission) {
        throw new Error('Access denied: Only workspace owners or project leads can delete projects');
      }

      const deleted = await ProjectModel.delete(id);
      if (!deleted) {
        throw new Error('Failed to delete project');
      }

      logger.info('PROJECT_DELETED', context.user.userId, context.ipAddress, { projectId: id });

      return 'Project deleted successfully';
    },

    addProjectMember: async (_: any, { projectId, userId, role = 'CONTRIBUTOR' }: any, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const project = await ProjectModel.findById(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      // Check workspace membership
      const workspaceMembership = await WorkspaceMemberModel.findByWorkspaceAndUser(project.workspaceId, context.user.userId);
      if (!workspaceMembership) {
        throw new Error('Access denied: Not a member of the parent workspace');
      }

      // Check permissions - workspace owners or project leads can add members
      let hasPermission = workspaceMembership.role === 'OWNER';
      if (!hasPermission) {
        const projectMembership = await ProjectMembershipModel.findByProjectAndUser(projectId, context.user.userId);
        hasPermission = projectMembership?.role === 'PROJECT_LEAD';
      }

      if (!hasPermission) {
        throw new Error('Access denied: Only workspace owners or project leads can add project members');
      }

      // Check if user to add exists and is a workspace member
      const userToAdd = await UserModel.findById(userId);
      if (!userToAdd) {
        throw new Error('User not found');
      }

      const isWorkspaceMember = await WorkspaceMemberModel.isMember(project.workspaceId, userId);
      if (!isWorkspaceMember) {
        throw new Error('User must be a member of the parent workspace first');
      }

      // Check if user is already a project member
      const existingMembership = await ProjectMembershipModel.findByProjectAndUser(projectId, userId);
      if (existingMembership) {
        throw new Error('User is already a member of this project');
      }

      // Validate role
      if (!['PROJECT_LEAD', 'CONTRIBUTOR', 'PROJECT_VIEWER'].includes(role)) {
        throw new Error('Invalid role. Must be PROJECT_LEAD, CONTRIBUTOR, or PROJECT_VIEWER');
      }

      const membership = await ProjectMembershipModel.create({
        projectId,
        userId,
        role
      });

      logger.info('PROJECT_MEMBER_ADDED', context.user.userId, context.ipAddress, {
        projectId,
        addedUserId: userId,
        role
      });

      return membership;
    },

    updateProjectMemberRole: async (_: any, { projectId, userId, role }: any, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const project = await ProjectModel.findById(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      // Check workspace membership
      const workspaceMembership = await WorkspaceMemberModel.findByWorkspaceAndUser(project.workspaceId, context.user.userId);
      if (!workspaceMembership) {
        throw new Error('Access denied: Not a member of the parent workspace');
      }

      // Check permissions - workspace owners or project leads can update roles
      let hasPermission = workspaceMembership.role === 'OWNER';
      if (!hasPermission) {
        const projectMembership = await ProjectMembershipModel.findByProjectAndUser(projectId, context.user.userId);
        hasPermission = projectMembership?.role === 'PROJECT_LEAD';
      }

      if (!hasPermission) {
        throw new Error('Access denied: Only workspace owners or project leads can update member roles');
      }

      // Check if user is a project member
      const membership = await ProjectMembershipModel.findByProjectAndUser(projectId, userId);
      if (!membership) {
        throw new Error('User is not a member of this project');
      }

      // Validate role
      if (!['PROJECT_LEAD', 'CONTRIBUTOR', 'PROJECT_VIEWER'].includes(role)) {
        throw new Error('Invalid role. Must be PROJECT_LEAD, CONTRIBUTOR, or PROJECT_VIEWER');
      }

      const updatedMembership = await ProjectMembershipModel.updateRole(projectId, userId, role);
      if (!updatedMembership) {
        throw new Error('Failed to update member role');
      }

      logger.info('PROJECT_MEMBER_ROLE_UPDATED', context.user.userId, context.ipAddress, {
        projectId,
        updatedUserId: userId,
        newRole: role
      });

      return updatedMembership;
    },

    removeProjectMember: async (_: any, { projectId, userId }: any, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const project = await ProjectModel.findById(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      // Check workspace membership
      const workspaceMembership = await WorkspaceMemberModel.findByWorkspaceAndUser(project.workspaceId, context.user.userId);
      if (!workspaceMembership) {
        throw new Error('Access denied: Not a member of the parent workspace');
      }

      // Check permissions - workspace owners or project leads can remove members
      let hasPermission = workspaceMembership.role === 'OWNER';
      if (!hasPermission) {
        const projectMembership = await ProjectMembershipModel.findByProjectAndUser(projectId, context.user.userId);
        hasPermission = projectMembership?.role === 'PROJECT_LEAD';
      }

      if (!hasPermission) {
        throw new Error('Access denied: Only workspace owners or project leads can remove project members');
      }

      // Check if user is a project member
      const membership = await ProjectMembershipModel.findByProjectAndUser(projectId, userId);
      if (!membership) {
        throw new Error('User is not a member of this project');
      }

      const removed = await ProjectMembershipModel.removeMember(projectId, userId);
      if (!removed) {
        throw new Error('Failed to remove member');
      }

      logger.info('PROJECT_MEMBER_REMOVED', context.user.userId, context.ipAddress, {
        projectId,
        removedUserId: userId
      });

      return 'Member removed successfully';
    },
  },

  Project: {
    workspace: async (project: any) => {
      // Import here to avoid circular dependency
      const { WorkspaceModel } = await import('../../models/Workspace');
      return await WorkspaceModel.findById(project.workspaceId);
    },

    members: async (project: any) => {
      return await ProjectMembershipModel.findByProjectId(project.id);
    },
  },

  ProjectMembership: {
    user: async (membership: any) => {
      return await UserModel.findById(membership.userId);
    },

    project: async (membership: any) => {
      return await ProjectModel.findById(membership.projectId);
    },
  },
};