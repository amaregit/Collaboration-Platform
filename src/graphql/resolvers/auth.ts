import { UserModel } from '../../models/User';
import logger from '../../utils/logger';
import type { Context } from '../../types';

export const authResolvers = {
  Query: {
    me: async (_: any, __: any, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const user = await UserModel.findById(context.user.userId);
      if (!user) {
        throw new Error('User not found');
      }

      return user;
    },
  },

  Mutation: {
    register: async (_: any, { email, password, firstName, lastName }: any) => {
      // Check if user already exists
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        throw new Error('User already exists');
      }

      // Hash password
      const { AuthUtils } = await import('../../utils/auth');
      const passwordHash = await AuthUtils.hashPassword(password);

      // Create user
      const user = await UserModel.create({
        email,
        passwordHash,
        firstName,
        lastName,
        globalStatus: 'ACTIVE'
      });

      logger.info('USER_REGISTERED', user.id, undefined, { email });

      return user;
    },

    forgotPassword: async (_: any, { email }: any) => {
      // Find user
      const user = await UserModel.findByEmail(email);
      if (!user) {
        // Don't reveal if user exists or not for security
        return true;
      }

      // In a real implementation, you would:
      // 1. Generate a reset token
      // 2. Store it in database with expiration
      // 3. Send email with reset link
      // For demo purposes, we'll just log it

      logger.info('PASSWORD_RESET_REQUESTED', user.id, undefined, { email });

      // Mock email sending
      console.log(`Password reset link would be sent to: ${email}`);

      return true;
    },

    updatePassword: async (_: any, { currentPassword, newPassword }: any, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const userId = context.user.userId;

      // Get user
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user data is valid
      if (!user.passwordHash) {
        logger.error('Password update failed - corrupted user account', userId, context.ipAddress, { userId });
        throw new Error('Password update failed');
      }

      // Verify current password
      const { AuthUtils } = await import('../../utils/auth');
      const isValidPassword = await AuthUtils.verifyPassword(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }

      // Validate new password input
      if (typeof newPassword !== 'string' || newPassword.length === 0) {
        throw new Error('Invalid new password');
      }

      // Hash new password
      const newPasswordHash = await AuthUtils.hashPassword(newPassword);

      // Update password
      await UserModel.updatePassword(userId, newPasswordHash);

      // Revoke all refresh tokens for security
      const { UserDeviceModel } = await import('../../models/UserDevice');
      await UserDeviceModel.revokeAllUserTokens(userId);

      logger.security('PASSWORD_UPDATED', userId, context.ipAddress);

      return 'Password updated successfully';
    },

    userBan: async (_: any, { userId }: any, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Check if user is admin
      if (context.user.globalStatus !== 'ADMIN') {
        throw new Error('Access denied: Admin privileges required');
      }

      // Find target user
      const targetUser = await UserModel.findById(userId);
      if (!targetUser) {
        throw new Error('User not found');
      }

      // Update user status to BANNED
      await UserModel.updateStatus(userId, 'BANNED');

      // Revoke all refresh tokens for security
      const { UserDeviceModel } = await import('../../models/UserDevice');
      await UserDeviceModel.revokeAllUserTokens(userId);

      logger.security('USER_BANNED', context.user.userId, context.ipAddress, {
        targetUserId: userId,
        targetEmail: targetUser.email
      });

      return `User ${targetUser.email} has been banned`;
    },

    userUnban: async (_: any, { userId }: any, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Check if user is admin
      if (context.user.globalStatus !== 'ADMIN') {
        throw new Error('Access denied: Admin privileges required');
      }

      // Find target user
      const targetUser = await UserModel.findById(userId);
      if (!targetUser) {
        throw new Error('User not found');
      }

      // Update user status to ACTIVE
      await UserModel.updateStatus(userId, 'ACTIVE');

      logger.security('USER_UNBANNED', context.user.userId, context.ipAddress, {
        targetUserId: userId,
        targetEmail: targetUser.email
      });

      return `User ${targetUser.email} has been unbanned`;
    },

    subscribeToPushNotifications: async (_: any, { subscription }: any, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const pushService = await import('../../services/pushNotification');
      await pushService.default.subscribeUser(context.user.userId, subscription, context.userAgent);

      return 'Successfully subscribed to push notifications';
    },

    unsubscribeFromPushNotifications: async (_: any, { endpoint }: any, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const pushService = await import('../../services/pushNotification');
      await pushService.default.unsubscribeUser(context.user.userId, endpoint);

      return 'Successfully unsubscribed from push notifications';
    },

    adminResetPassword: async (_: any, { userId }: any, context: any) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Check if user is admin
      if (context.user.globalStatus !== 'ADMIN') {
        throw new Error('Access denied: Admin privileges required');
      }

      // Find target user
      const targetUser = await UserModel.findById(userId);
      if (!targetUser) {
        throw new Error('User not found');
      }

      // Generate a temporary password
      const tempPassword = Math.random().toString(36).slice(-12) + 'Temp123!';
      const { AuthUtils } = await import('../../utils/auth');
      const passwordHash = await AuthUtils.hashPassword(tempPassword);

      // Update password
      await UserModel.updatePassword(userId, passwordHash);

      // Revoke all refresh tokens for security
      const { UserDeviceModel } = await import('../../models/UserDevice');
      await UserDeviceModel.revokeAllUserTokens(userId);

      logger.security('ADMIN_PASSWORD_RESET', context.user.userId, context.ipAddress, {
        targetUserId: userId,
        targetEmail: targetUser.email
      });

      // In a real implementation, you would send the temp password via email
      console.log(`Admin reset password for ${targetUser.email}: ${tempPassword}`);

      return {
        success: true,
        message: `Password reset for ${targetUser.email}. Temporary password sent.`,
        tempPassword: tempPassword // Only for demo - never return in production!
      };
    },
  },
};