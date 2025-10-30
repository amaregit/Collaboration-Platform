import { PubSub } from 'graphql-subscriptions';
import { withFilter } from 'graphql-subscriptions';
import { WorkspaceMemberModel } from '../../models/Workspace';
import type { Context } from '../../types';

export const pubsub = new PubSub();

export const subscriptionResolvers = {
  Subscription: {
    taskStatusUpdated: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['TASK_STATUS_UPDATED']),
        async (payload: any, variables: any, context: Context | undefined) => {
          if (!context?.user) {
            return false;
          }

          // Check if user is a member of the workspace where the task status was updated
          const workspaceId = payload.workspaceId;
          const isMember = await WorkspaceMemberModel.isMember(workspaceId, context.user.userId);

          return isMember;
        }
      ),
    },
  },
};