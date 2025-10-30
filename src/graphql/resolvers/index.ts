import { authResolvers } from './auth';
import { workspaceResolvers } from './workspace';
import { projectResolvers } from './project';
import { taskResolvers } from './task';
import { notificationResolvers } from './notification';
import { aiResolvers } from './ai';
import { subscriptionResolvers } from './subscription';

export const resolvers = {
  Query: {
    _empty: () => 'GraphQL API is running',
    ...authResolvers.Query,
    ...workspaceResolvers.Query,
    ...projectResolvers.Query,
    ...taskResolvers.Query,
    ...notificationResolvers.Query,
    ...aiResolvers.Query,
  },
  Mutation: {
    _empty: () => 'Mutations are available',
    ...authResolvers.Mutation,
    ...workspaceResolvers.Mutation,
    ...projectResolvers.Mutation,
    ...taskResolvers.Mutation,
    ...notificationResolvers.Mutation,
    ...aiResolvers.Mutation,
  },
  Subscription: {
    _empty: () => 'Subscriptions are available',
    ...subscriptionResolvers.Subscription,
  },
  ...workspaceResolvers,
  ...projectResolvers,
  ...taskResolvers.Task,
  ...notificationResolvers,
};