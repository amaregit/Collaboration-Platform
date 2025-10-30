import { NotificationModel } from '../../models/Notification';
import { UserModel } from '../../models/User';
import type { Context } from '../../types';

export const notificationResolvers = {
  Query: {
    getNotifications: async (_: any, __: any, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      return await NotificationModel.findByRecipientId(context.user.userId);
    },

    getNotification: async (_: any, { id }: any, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const notification = await NotificationModel.findById(id);
      if (!notification) {
        throw new Error('Notification not found');
      }

      // Check if user is the recipient
      if (notification.recipientId !== context.user.userId) {
        throw new Error('Access denied: Not your notification');
      }

      return notification;
    },

    getUnreadNotificationCount: async (_: any, __: any, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      return await NotificationModel.getUnreadCount(context.user.userId);
    },
  },

  Mutation: {
    markNotificationAsSeen: async (_: any, { id }: any, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const notification = await NotificationModel.findById(id);
      if (!notification) {
        throw new Error('Notification not found');
      }

      // Check if user is the recipient
      if (notification.recipientId !== context.user.userId) {
        throw new Error('Access denied: Not your notification');
      }

      const updatedNotification = await NotificationModel.markAsSeen(id);
      return updatedNotification;
    },

    markAllNotificationsAsSeen: async (_: any, __: any, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      return await NotificationModel.markAllAsSeen(context.user.userId);
    },
  },

  Notification: {
    recipient: async (notification: any) => {
      return await UserModel.findById(notification.recipientId);
    },
  },
};