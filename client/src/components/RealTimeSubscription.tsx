'use client';

import { useEffect, useState } from 'react';

interface TaskUpdate {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
}

interface RealTimeSubscriptionProps {
  workspaceId: string;
  onTaskUpdate: (task: TaskUpdate) => void;
}

export default function RealTimeSubscription({ workspaceId, onTaskUpdate }: RealTimeSubscriptionProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  useEffect(() => {
    if (!workspaceId) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    // Create WebSocket connection for GraphQL subscriptions
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//localhost:4000/graphql`;

    const ws = new WebSocket(wsUrl, 'graphql-ws');

    ws.onopen = () => {
      console.log('WebSocket connected for real-time updates');

      // Send connection init
      ws.send(JSON.stringify({
        type: 'connection_init',
        payload: {
          Authorization: `Bearer ${token}`
        }
      }));

      setConnectionStatus('connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'connection_ack') {
        console.log('Connection acknowledged, starting subscription');

        // Start subscription to task status updates
        ws.send(JSON.stringify({
          id: 'task-status-subscription',
          type: 'start',
          payload: {
            query: `
              subscription TaskStatusUpdated($workspaceId: ID!) {
                taskStatusUpdated(workspaceId: $workspaceId) {
                  id
                  title
                  status
                  updatedAt
                }
              }
            `,
            variables: { workspaceId }
          }
        }));
      } else if (data.type === 'data' && data.id === 'task-status-subscription') {
        const taskUpdate = data.payload.data.taskStatusUpdated;
        if (taskUpdate) {
          console.log('Real-time task update received:', taskUpdate);
          onTaskUpdate(taskUpdate);
        }
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setConnectionStatus('disconnected');
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionStatus('disconnected');
      setIsConnected(false);
    };

    // Cleanup on unmount or workspaceId change
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          id: 'task-status-subscription',
          type: 'stop'
        }));
        ws.close();
      }
    };
  }, [workspaceId, onTaskUpdate]);

  // Visual indicator for connection status
  return (
    <div className="flex items-center space-x-2 text-sm">
      <div
        className={`w-2 h-2 rounded-full ${
          connectionStatus === 'connected'
            ? 'bg-green-500'
            : connectionStatus === 'connecting'
            ? 'bg-yellow-500 animate-pulse'
            : 'bg-red-500'
        }`}
      />
      <span className="text-gray-600">
        {connectionStatus === 'connected'
          ? 'Live updates active'
          : connectionStatus === 'connecting'
          ? 'Connecting...'
          : 'Disconnected'
        }
      </span>
    </div>
  );
}