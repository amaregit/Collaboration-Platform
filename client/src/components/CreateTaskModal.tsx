'use client';

import { useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId: string;
  workspaceId: string;
}

export default function CreateTaskModal({ isOpen, onClose, onSuccess, projectId, workspaceId }: CreateTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedToIds, setAssignedToIds] = useState<string[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && workspaceId) {
      loadWorkspaceMembers();
    }
  }, [isOpen, workspaceId]);

  const loadWorkspaceMembers = async () => {
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
            query GetWorkspace($id: ID!) {
              getWorkspace(id: $id) {
                members {
                  user {
                    id
                    email
                    firstName
                    lastName
                  }
                }
              }
            }
          `,
          variables: { id: workspaceId },
        }),
      });

      const data = await response.json();
      if (data.data?.getWorkspace?.members) {
        setWorkspaceMembers(data.data.getWorkspace.members.map((m: any) => m.user));
      }
    } catch (error) {
      console.error('Failed to load workspace members:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

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
            mutation CreateTask($projectId: ID!, $title: String!, $description: String, $assignedToIds: [ID!]) {
              createTask(projectId: $projectId, title: $title, description: $description, assignedToIds: $assignedToIds) {
                id
                title
                description
                status
              }
            }
          `,
          variables: {
            projectId,
            title: title.trim(),
            description: description.trim() || null,
            assignedToIds: assignedToIds.length > 0 ? assignedToIds : null
          },
        }),
      });

      const data = await response.json();
      if (data.data?.createTask) {
        setTitle('');
        setDescription('');
        setAssignedToIds([]);
        onSuccess();
        onClose();
      } else {
        alert('Failed to create task');
      }
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('Error creating task');
    } finally {
      setLoading(false);
    }
  };

  const toggleAssignee = (userId: string) => {
    setAssignedToIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Task</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Task Title *
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter task title"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter task description (optional)"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign to Team Members
            </label>
            <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
              {workspaceMembers.map((user) => (
                <label key={user.id} className="flex items-center space-x-2 py-1">
                  <input
                    type="checkbox"
                    checked={assignedToIds.includes(user.id)}
                    onChange={() => toggleAssignee(user.id)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">
                    {user.firstName} {user.lastName}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}