import webPush from 'web-push';
import { PushSubscriptionModel } from '../models/PushSubscription';
import logger from '../utils/logger';

class PushNotificationService {
  constructor() {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      throw new Error('VAPID keys not configured. Please set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables.');
    }

    webPush.setVapidDetails(
      'mailto:' + (process.env.VAPID_EMAIL || 'admin@example.com'),
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  }

  async subscribeUser(userId: string, subscription: any, userAgent?: string): Promise<void> {
    try {
      await PushSubscriptionModel.create({
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent
      });

      logger.info('PUSH_SUBSCRIPTION_CREATED', userId, undefined, {
        endpoint: subscription.endpoint.substring(0, 50) + '...'
      });
    } catch (error) {
      logger.error('PUSH_SUBSCRIPTION_FAILED', userId, undefined, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async unsubscribeUser(userId: string, endpoint: string): Promise<void> {
    try {
      await PushSubscriptionModel.delete(userId, endpoint);
      logger.info('PUSH_SUBSCRIPTION_REMOVED', userId, undefined, { endpoint: endpoint.substring(0, 50) + '...' });
    } catch (error) {
      logger.error('PUSH_UNSUBSCRIPTION_FAILED', userId, undefined, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async sendNotificationToUser(userId: string, title: string, body: string, data?: any): Promise<void> {
    try {
      const subscriptions = await PushSubscriptionModel.findByUserId(userId);

      if (subscriptions.length === 0) {
        logger.warn('NO_PUSH_SUBSCRIPTIONS', userId, undefined, { title });
        return;
      }

      const payload = JSON.stringify({
        title,
        body,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        data: data || {}
      });

      const sendPromises = subscriptions.map(async (subscription) => {
        try {
          await webPush.sendNotification({
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth
            }
          }, payload);
        } catch (error) {
          // If subscription is invalid, remove it
          if ((error as any).statusCode === 410 || (error as any).statusCode === 400) {
            await PushSubscriptionModel.delete(userId, subscription.endpoint);
            logger.warn('INVALID_PUSH_SUBSCRIPTION_REMOVED', userId, undefined, {
              endpoint: subscription.endpoint.substring(0, 50) + '...'
            });
          } else {
            logger.error('PUSH_NOTIFICATION_FAILED', userId, undefined, {
              error: error instanceof Error ? error.message : 'Unknown error',
              endpoint: subscription.endpoint.substring(0, 50) + '...'
            });
          }
        }
      });

      await Promise.allSettled(sendPromises);

      logger.info('PUSH_NOTIFICATION_SENT', userId, undefined, {
        title,
        subscriptionsCount: subscriptions.length
      });
    } catch (error) {
      logger.error('PUSH_NOTIFICATION_ERROR', userId, undefined, {
        error: error instanceof Error ? error.message : 'Unknown error',
        title
      });
      throw error;
    }
  }

  async sendNotificationToUsers(userIds: string[], title: string, body: string, data?: any): Promise<void> {
    const sendPromises = userIds.map(userId =>
      this.sendNotificationToUser(userId, title, body, data)
    );

    await Promise.allSettled(sendPromises);
  }

  getVapidPublicKey(): string {
    return process.env.VAPID_PUBLIC_KEY!;
  }
}

export default new PushNotificationService();