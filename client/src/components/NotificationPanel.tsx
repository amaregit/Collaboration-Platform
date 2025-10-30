'use client';

import { useState, useEffect } from 'react';

interface Notification {
  id: string;
  title: string;
  body: string;
  status: 'DELIVERED' | 'SEEN';
  createdAt: string;
  recipient: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const loadNotifications = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');

    try {
      const response = await fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: `
            query {
              getNotifications {
                id
                title
                body
                status
                createdAt
                recipient {
                  id
                  email
                  firstName
                  lastName
                }
              }
              getUnreadNotificationCount
            }
          `,
        }),
      });

      const data = await response.json();
      if (data.data) {
        setNotifications(data.data.getNotifications || []);
        setUnreadCount(data.data.getUnreadNotificationCount || 0);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsSeen = async (notificationId: string) => {
    const token = localStorage.getItem('token');

    try {
      const response = await fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: `
            mutation MarkAsSeen($id: ID!) {
              markNotificationAsSeen(id: $id) {
                id
                status
              }
            }
          `,
          variables: { id: notificationId },
        }),
      });

      const data = await response.json();
      if (data.data?.markNotificationAsSeen) {
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId
              ? { ...n, status: 'SEEN' as const }
              : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark notification as seen:', error);
    }
  };

  const markAllAsSeen = async () => {
    const token = localStorage.getItem('token');

    try {
      const response = await fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: `
            mutation {
              markAllNotificationsAsSeen
            }
          `,
        }),
      });

      const data = await response.json();
      if (data.data?.markAllNotificationsAsSeen) {
        setNotifications(prev =>
          prev.map(n => ({ ...n, status: 'SEEN' as const }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to mark all notifications as seen:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            Notifications {unreadCount > 0 && `(${unreadCount} unread)`}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Mark All as Read Button */}
        {unreadCount > 0 && (
          <div className="p-4 border-b bg-blue-50">
            <button
              onClick={markAllAsSeen}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Mark All as Read
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.868 12.683A17.925 17.925 0 0112 21c7.962 0 12.21-8.21 4.868-12.683L12 3 4.868 12.683z" />
              </svg>
              <p className="mt-2 text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg border ${
                    notification.status === 'DELIVERED'
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-sm font-medium text-gray-900">
                      {notification.title}
                    </h3>
                    {notification.status === 'DELIVERED' && (
                      <button
                        onClick={() => markAsSeen(notification.id)}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    {notification.body}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(notification.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}