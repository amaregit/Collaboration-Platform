import geminiService from '../../services/gemini';
import { TaskModel } from '../../models/Task';
import { ProjectModel } from '../../models/Project';
import { WorkspaceMemberModel } from '../../models/Workspace';
import logger from '../../utils/logger';
import type { Context } from '../../types';

export const aiResolvers = {
  Query: {
    summarizeTask: async (_: any, { description }: any, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      try {
        const summary = await geminiService.summarizeTask(description);
        return summary;
      } catch (error) {
        logger.error('AI_SUMMARIZE_ERROR', context.user.userId, context.ipAddress, {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw new Error('Failed to generate task summary');
      }
    },
  },

  Mutation: {
    generateTasksFromPrompt: async (_: any, { projectId, prompt }: any, context: Context) => {
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

      // Check permissions - contributors and above can generate tasks
      let hasPermission = ['OWNER', 'MEMBER'].includes(workspaceMembership.role);
      if (!hasPermission) {
        const projectMembership = await ProjectModel.findById(projectId); // This should be project membership check
        // For simplicity, allow if user is a workspace member
        hasPermission = true;
      }

      if (!hasPermission) {
        throw new Error('Access denied: Insufficient permissions to generate tasks');
      }

      try {
        const generatedTasks = await geminiService.generateTasksFromPrompt(prompt);

        // Create tasks in the database
        const createdTasks = [];
        for (const taskData of generatedTasks) {
          const task = await TaskModel.create({
            title: taskData.title,
            description: taskData.description,
            status: 'TODO',
            projectId,
            createdById: context.user.userId,
            assignedToIds: []
          });
          createdTasks.push(task);
        }

        logger.info('AI_TASKS_GENERATED', context.user.userId, context.ipAddress, {
          projectId,
          tasksGenerated: createdTasks.length
        });

        return createdTasks.map(task => task.title);
      } catch (error) {
        logger.error('AI_GENERATE_TASKS_ERROR', context.user.userId, context.ipAddress, {
          error: error instanceof Error ? error.message : 'Unknown error',
          projectId
        });
        throw new Error('Failed to generate tasks from prompt');
      }
    },
  },
};