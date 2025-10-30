import { TaskModel } from '../../models/Task';
import { ProjectModel } from '../../models/Project';
import { WorkspaceMemberModel } from '../../models/Workspace';
import { ProjectMembershipModel } from '../../models/Project';
import { NotificationModel } from '../../models/Notification';
import { UserModel } from '../../models/User';
import logger from '../../utils/logger';
import type { Context } from '../../types';

export const taskResolvers = {
  Query: {
    getTask: async (_: any, { id }: any, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const task = await TaskModel.findById(id);
      if (!task) {
        throw new Error('Task not found');
      }

      // Check project access
      const project = await ProjectModel.findById(task.projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      // Check workspace membership
      const workspaceMembership = await WorkspaceMemberModel.findByWorkspaceAndUser(project.workspaceId, context.user.userId);
      if (!workspaceMembership) {
        throw new Error('Access denied: Not a member of the parent workspace');
      }

      // Check project membership if user is only a viewer
      if (workspaceMembership.role === 'VIEWER') {
        const projectMembership = await ProjectMembershipModel.findByProjectAndUser(task.projectId, context.user.userId);
        if (!projectMembership) {
          throw new Error('Access denied: Not a member of this project');
        }
      }

      return task;
    },

    getTasks: async (_: any, { projectId }: any, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Check project access
      const project = await ProjectModel.findById(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      // Check workspace membership
      const workspaceMembership = await WorkspaceMemberModel.findByWorkspaceAndUser(project.workspaceId, context.user.userId);
      if (!workspaceMembership) {
        throw new Error('Access denied: Not a member of the parent workspace');
      }

      // Check project membership if user is only a viewer
      if (workspaceMembership.role === 'VIEWER') {
        const projectMembership = await ProjectMembershipModel.findByProjectAndUser(projectId, context.user.userId);
        if (!projectMembership) {
          throw new Error('Access denied: Not a member of this project');
        }
      }

      return await TaskModel.findByProjectId(projectId);
    },

    getMyTasks: async (_: any, __: any, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      return await TaskModel.findByAssignedUser(context.user.userId);
    },
  },

  Mutation: {
    createTask: async (_: any, { projectId, title, description, assignedToIds = [] }: any, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Check project access
      const project = await ProjectModel.findById(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      // Check workspace membership
      const workspaceMembership = await WorkspaceMemberModel.findByWorkspaceAndUser(project.workspaceId, context.user.userId);
      if (!workspaceMembership) {
        throw new Error('Access denied: Not a member of the parent workspace');
      }

      // Check permissions - contributors and above can create tasks
      let hasPermission = ['OWNER', 'MEMBER'].includes(workspaceMembership.role);
      if (!hasPermission) {
        const projectMembership = await ProjectMembershipModel.findByProjectAndUser(projectId, context.user.userId);
        hasPermission = projectMembership?.role === 'PROJECT_LEAD' || projectMembership?.role === 'CONTRIBUTOR';
      }

      if (!hasPermission) {
        throw new Error('Access denied: Insufficient permissions to create tasks');
      }

      // Validate assigned users are workspace members
      if (assignedToIds.length > 0) {
        for (const userId of assignedToIds) {
          const isMember = await WorkspaceMemberModel.isMember(project.workspaceId, userId);
          if (!isMember) {
            throw new Error(`User ${userId} is not a member of the workspace`);
          }
        }
      }

      const task = await TaskModel.create({
        title,
        description,
        status: 'TODO',
        projectId,
        createdById: context.user.userId,
        assignedToIds
      });

      // Create notifications for assigned users
      if (assignedToIds.length > 0) {
        await NotificationModel.createTaskAssignmentNotifications(task.id, assignedToIds, title);

        // Send push notifications for task assignment
        try {
          const pushService = await import('../../services/pushNotification');
          await pushService.default.sendNotificationToUsers(
            assignedToIds,
            'Task Assigned',
            `You have been assigned to task: "${title}"`,
            { taskId: task.id, type: 'task_assigned' }
          );
        } catch (error) {
          logger.error('PUSH_NOTIFICATION_TASK_ASSIGNMENT_FAILED', context.user.userId, context.ipAddress, {
            error: error instanceof Error ? error.message : 'Unknown error',
            taskId: task.id
          });
        }
      }

      logger.info('TASK_CREATED', context.user.userId, context.ipAddress, {
        taskId: task.id,
        projectId
      });

      return task;
    },

    updateTask: async (_: any, { id, title, description, status, assignedToIds }: any, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const task = await TaskModel.findById(id);
      if (!task) {
        throw new Error('Task not found');
      }

      // Check project access
      const project = await ProjectModel.findById(task.projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      // Check workspace membership
      const workspaceMembership = await WorkspaceMemberModel.findByWorkspaceAndUser(project.workspaceId, context.user.userId);
      if (!workspaceMembership) {
        throw new Error('Access denied: Not a member of the parent workspace');
      }

      // Check permissions
      let hasPermission = ['OWNER', 'MEMBER'].includes(workspaceMembership.role);
      if (!hasPermission) {
        const projectMembership = await ProjectMembershipModel.findByProjectAndUser(task.projectId, context.user.userId);
        hasPermission = projectMembership?.role === 'PROJECT_LEAD' ||
                        (projectMembership?.role === 'CONTRIBUTOR' && task.assignedToIds.includes(context.user.userId));
      }

      if (!hasPermission) {
        throw new Error('Access denied: Insufficient permissions to update task');
      }

      // Validate assigned users are workspace members
      if (assignedToIds && assignedToIds.length > 0) {
        for (const userId of assignedToIds) {
          const isMember = await WorkspaceMemberModel.isMember(project.workspaceId, userId);
          if (!isMember) {
            throw new Error(`User ${userId} is not a member of the workspace`);
          }
        }
      }

      const oldAssignedToIds = task.assignedToIds;
      const updatedTask = await TaskModel.update(id, {
        title,
        description,
        status,
        assignedToIds
      });

      if (!updatedTask) {
        throw new Error('Failed to update task');
      }

      // Create notifications for newly assigned users
      if (assignedToIds) {
        const newAssignments = assignedToIds.filter((userId: string) => !oldAssignedToIds.includes(userId));
        if (newAssignments.length > 0) {
          await NotificationModel.createTaskAssignmentNotifications(id, newAssignments, updatedTask.title);

          // Send push notifications for new task assignments
          try {
            const pushService = await import('../../services/pushNotification');
            await pushService.default.sendNotificationToUsers(
              newAssignments,
              'Task Assigned',
              `You have been assigned to task: "${updatedTask.title}"`,
              { taskId: id, type: 'task_assigned' }
            );
          } catch (error) {
            logger.error('PUSH_NOTIFICATION_TASK_UPDATE_FAILED', context.user.userId, context.ipAddress, {
              error: error instanceof Error ? error.message : 'Unknown error',
              taskId: id
            });
          }
        }
      }

      // Log task status changes and publish subscription
      if (status && status !== task.status) {
        logger.info('TASK_STATUS_UPDATE', context.user.userId, context.ipAddress, {
          taskId: id,
          oldStatus: task.status,
          newStatus: status
        });

        // Publish real-time update
        const { pubsub } = await import('./subscription');
        pubsub.publish('TASK_STATUS_UPDATED', {
          taskStatusUpdated: updatedTask,
          workspaceId: project.workspaceId
        });
      }

      return updatedTask;
    },

    deleteTask: async (_: any, { id }: any, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const task = await TaskModel.findById(id);
      if (!task) {
        throw new Error('Task not found');
      }

      // Check project access
      const project = await ProjectModel.findById(task.projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      // Check workspace membership
      const workspaceMembership = await WorkspaceMemberModel.findByWorkspaceAndUser(project.workspaceId, context.user.userId);
      if (!workspaceMembership) {
        throw new Error('Access denied: Not a member of the parent workspace');
      }

      // Check permissions - only project leads or workspace owners can delete
      let hasPermission = workspaceMembership.role === 'OWNER';
      if (!hasPermission) {
        const projectMembership = await ProjectMembershipModel.findByProjectAndUser(task.projectId, context.user.userId);
        hasPermission = projectMembership?.role === 'PROJECT_LEAD';
      }

      if (!hasPermission) {
        throw new Error('Access denied: Only project leads or workspace owners can delete tasks');
      }

      const deleted = await TaskModel.delete(id);
      if (!deleted) {
        throw new Error('Failed to delete task');
      }

      // Clean up notifications
      await NotificationModel.deleteByRelatedEntityId(id);

      logger.info('TASK_DELETED', context.user.userId, context.ipAddress, { taskId: id });

      return 'Task deleted successfully';
    },

    updateTaskStatus: async (_: any, { id, status }: any, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const task = await TaskModel.findById(id);
      if (!task) {
        throw new Error('Task not found');
      }

      // Check project access
      const project = await ProjectModel.findById(task.projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      // Check workspace membership
      const workspaceMembership = await WorkspaceMemberModel.findByWorkspaceAndUser(project.workspaceId, context.user.userId);
      if (!workspaceMembership) {
        throw new Error('Access denied: Not a member of the parent workspace');
      }

      // Check permissions
      let hasPermission = ['OWNER', 'MEMBER'].includes(workspaceMembership.role);
      if (!hasPermission) {
        const projectMembership = await ProjectMembershipModel.findByProjectAndUser(task.projectId, context.user.userId);
        hasPermission = projectMembership?.role === 'PROJECT_LEAD' ||
                        (projectMembership?.role === 'CONTRIBUTOR' && task.assignedToIds.includes(context.user.userId));
      }

      if (!hasPermission) {
        throw new Error('Access denied: Insufficient permissions to update task status');
      }

      const updatedTask = await TaskModel.updateStatus(id, status);
      if (!updatedTask) {
        throw new Error('Failed to update task status');
      }

      logger.info('TASK_STATUS_UPDATE', context.user.userId, context.ipAddress, {
        taskId: id,
        oldStatus: task.status,
        newStatus: status
      });

      // Publish real-time update
      const { pubsub } = await import('./subscription');
      pubsub.publish('TASK_STATUS_UPDATED', {
        taskStatusUpdated: updatedTask,
        workspaceId: project.workspaceId
      });

      return updatedTask;
    },
  },

  Task: {
    assignedUsers: async (task: any) => {
      if (!task.assignedToIds || task.assignedToIds.length === 0) {
        return [];
      }

      const users = [];
      for (const userId of task.assignedToIds) {
        const user = await UserModel.findById(userId);
        if (user) {
          users.push(user);
        }
      }
      return users;
    },

    project: async (task: any) => {
      return await ProjectModel.findById(task.projectId);
    },

    createdBy: async (task: any) => {
      return await UserModel.findById(task.createdById);
    },
  },
};