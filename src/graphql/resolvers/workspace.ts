import { WorkspaceModel, WorkspaceMemberModel } from '../../models/Workspace';
import { UserModel } from '../../models/User';
import logger from '../../utils/logger';
import type { Context } from '../../types';

export const workspaceResolvers = {
  Query: {
    getWorkspace: async (_: any, { id }: any, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const workspace = await WorkspaceModel.findById(id);
      if (!workspace) {
        throw new Error('Workspace not found');
      }

      // Check if user is a member of the workspace
      const membership = await WorkspaceMemberModel.findByWorkspaceAndUser(id, context.user.userId);
      if (!membership) {
        throw new Error('Access denied: Not a member of this workspace');
      }

      return workspace;
    },

    getWorkspaces: async (_: any, __: any, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      return await WorkspaceMemberModel.findByUserId(context.user.userId);
    },

    getAllWorkspaces: async (_: any, __: any, context: Context) => {
      if (!context.user || context.user.globalStatus !== 'ADMIN') {
        throw new Error('Admin access required');
      }

      return await WorkspaceModel.findAll();
    },
  },

  Mutation: {
    createWorkspace: async (_: any, { name }: any, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Create workspace
      const workspace = await WorkspaceModel.create({
        name,
        ownerId: context.user.userId
      });

      // Add creator as owner
      await WorkspaceMemberModel.create({
        workspaceId: workspace.id,
        userId: context.user.userId,
        role: 'OWNER'
      });

      logger.info('WORKSPACE_CREATED', context.user.userId, context.ipAddress, { workspaceId: workspace.id });

      return workspace;
    },

    updateWorkspace: async (_: any, { id, name }: any, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const workspace = await WorkspaceModel.findById(id);
      if (!workspace) {
        throw new Error('Workspace not found');
      }

      // Check if user is the owner
      const membership = await WorkspaceMemberModel.findByWorkspaceAndUser(id, context.user.userId);
      if (!membership || membership.role !== 'OWNER') {
        throw new Error('Access denied: Only workspace owners can update workspace details');
      }

      const updatedWorkspace = await WorkspaceModel.update(id, { name });
      if (!updatedWorkspace) {
        throw new Error('Failed to update workspace');
      }

      logger.info('WORKSPACE_UPDATED', context.user.userId, context.ipAddress, { workspaceId: id });

      return updatedWorkspace;
    },

    deleteWorkspace: async (_: any, { id }: any, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const workspace = await WorkspaceModel.findById(id);
      if (!workspace) {
        throw new Error('Workspace not found');
      }

      // Check if user is the owner
      const membership = await WorkspaceMemberModel.findByWorkspaceAndUser(id, context.user.userId);
      if (!membership || membership.role !== 'OWNER') {
        throw new Error('Access denied: Only workspace owners can delete workspaces');
      }

      const deleted = await WorkspaceModel.delete(id);
      if (!deleted) {
        throw new Error('Failed to delete workspace');
      }

      logger.info('WORKSPACE_DELETED', context.user.userId, context.ipAddress, { workspaceId: id });

      return 'Workspace deleted successfully';
    },

    addWorkspaceMember: async (_: any, { workspaceId, userId, role = 'MEMBER' }: any, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const workspace = await WorkspaceModel.findById(workspaceId);
      if (!workspace) {
        throw new Error('Workspace not found');
      }

      // Check if current user is the owner
      const currentUserMembership = await WorkspaceMemberModel.findByWorkspaceAndUser(workspaceId, context.user.userId);
      if (!currentUserMembership || currentUserMembership.role !== 'OWNER') {
        throw new Error('Access denied: Only workspace owners can add members');
      }

      // Check if user to add exists
      const userToAdd = await UserModel.findById(userId);
      if (!userToAdd) {
        throw new Error('User not found');
      }

      // Check if user is already a member
      const existingMembership = await WorkspaceMemberModel.findByWorkspaceAndUser(workspaceId, userId);
      if (existingMembership) {
        throw new Error('User is already a member of this workspace');
      }

      // Validate role
      if (!['OWNER', 'MEMBER', 'VIEWER'].includes(role)) {
        throw new Error('Invalid role. Must be OWNER, MEMBER, or VIEWER');
      }

      const membership = await WorkspaceMemberModel.create({
        workspaceId,
        userId,
        role
      });

      logger.info('WORKSPACE_MEMBER_ADDED', context.user.userId, context.ipAddress, {
        workspaceId,
        addedUserId: userId,
        role
      });

      return membership;
    },

    updateWorkspaceMemberRole: async (_: any, { workspaceId, userId, role }: any, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const workspace = await WorkspaceModel.findById(workspaceId);
      if (!workspace) {
        throw new Error('Workspace not found');
      }

      // Check if current user is the owner
      const currentUserMembership = await WorkspaceMemberModel.findByWorkspaceAndUser(workspaceId, context.user.userId);
      if (!currentUserMembership || currentUserMembership.role !== 'OWNER') {
        throw new Error('Access denied: Only workspace owners can update member roles');
      }

      // Cannot change the owner's role
      if (userId === workspace.ownerId) {
        throw new Error('Cannot change the workspace owner\'s role');
      }

      // Check if user is a member
      const membership = await WorkspaceMemberModel.findByWorkspaceAndUser(workspaceId, userId);
      if (!membership) {
        throw new Error('User is not a member of this workspace');
      }

      // Validate role
      if (!['OWNER', 'MEMBER', 'VIEWER'].includes(role)) {
        throw new Error('Invalid role. Must be OWNER, MEMBER, or VIEWER');
      }

      const updatedMembership = await WorkspaceMemberModel.updateRole(workspaceId, userId, role);
      if (!updatedMembership) {
        throw new Error('Failed to update member role');
      }

      logger.info('WORKSPACE_MEMBER_ROLE_UPDATED', context.user.userId, context.ipAddress, {
        workspaceId,
        updatedUserId: userId,
        newRole: role
      });

      return updatedMembership;
    },

    removeWorkspaceMember: async (_: any, { workspaceId, userId }: any, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const workspace = await WorkspaceModel.findById(workspaceId);
      if (!workspace) {
        throw new Error('Workspace not found');
      }

      // Check if current user is the owner
      const currentUserMembership = await WorkspaceMemberModel.findByWorkspaceAndUser(workspaceId, context.user.userId);
      if (!currentUserMembership || currentUserMembership.role !== 'OWNER') {
        throw new Error('Access denied: Only workspace owners can remove members');
      }

      // Cannot remove the owner
      if (userId === workspace.ownerId) {
        throw new Error('Cannot remove the workspace owner');
      }

      // Check if user is a member
      const membership = await WorkspaceMemberModel.findByWorkspaceAndUser(workspaceId, userId);
      if (!membership) {
        throw new Error('User is not a member of this workspace');
      }

      const removed = await WorkspaceMemberModel.removeMember(workspaceId, userId);
      if (!removed) {
        throw new Error('Failed to remove member');
      }

      logger.info('WORKSPACE_MEMBER_REMOVED', context.user.userId, context.ipAddress, {
        workspaceId,
        removedUserId: userId
      });

      return 'Member removed successfully';
    },
  },

  Workspace: {
    members: async (workspace: any) => {
      return await WorkspaceMemberModel.findByWorkspaceId(workspace.id);
    },

    owner: async (workspace: any) => {
      return await UserModel.findById(workspace.ownerId);
    },
  },

  WorkspaceMember: {
    user: async (member: any) => {
      return await UserModel.findById(member.userId);
    },
  },
};