'use client';

import { useState, useEffect } from 'react';

interface ProjectMember {
  id: string;
  userId: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

interface ProjectMemberManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
}

export default function ProjectMemberManagementModal({
  isOpen,
  onClose,
  projectId,
  projectName
}: ProjectMemberManagementModalProps) {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingMember, setUpdatingMember] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const fetchMembers = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: `
            query GetProject($id: ID!) {
              getProject(id: $id) {
                members {
                  id
                  userId
                  role
                  joinedAt
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
          variables: { id: projectId },
        }),
      });

      const data = await response.json();
      if (data.data?.getProject?.members) {
        setMembers(data.data.getProject.members);
      }
    } catch (error) {
      console.error('Failed to fetch project members:', error);
    }
  };

  useEffect(() => {
    if (isOpen && projectId) {
      fetchMembers();
    }
  }, [isOpen, projectId]);

  const handleRoleChange = async (memberId: string, userId: string, newRole: string) => {
    setUpdatingMember(memberId);
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
            mutation UpdateProjectMemberRole($projectId: ID!, $userId: ID!, $role: String!) {
              updateProjectMemberRole(projectId: $projectId, userId: $userId, role: $role) {
                id
                role
              }
            }
          `,
          variables: { projectId, userId, role: newRole },
        }),
      });

      const data = await response.json();
      if (data.data?.updateProjectMemberRole) {
        setMessage('Member role updated successfully');
        fetchMembers(); // Refresh the list
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(data.errors?.[0]?.message || 'Failed to update role');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
    } finally {
      setUpdatingMember(null);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member from the project?')) {
      return;
    }

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
            mutation RemoveProjectMember($projectId: ID!, $userId: ID!) {
              removeProjectMember(projectId: $projectId, userId: $userId)
            }
          `,
          variables: { projectId, userId },
        }),
      });

      const data = await response.json();
      if (data.data?.removeProjectMember) {
        setMessage('Member removed successfully');
        fetchMembers(); // Refresh the list
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(data.errors?.[0]?.message || 'Failed to remove member');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Manage Project Members
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Project: {projectName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {message && (
          <div className={`mb-4 text-sm p-3 rounded-md ${
            message.includes('success')
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message}
          </div>
        )}

        <div className="space-y-4">
          {members.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No members found</p>
          ) : (
            members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                    {member.user.firstName[0]}{member.user.lastName[0]}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {member.user.firstName} {member.user.lastName}
                    </p>
                    <p className="text-sm text-gray-600">{member.user.email}</p>
                    <p className="text-xs text-gray-500">
                      Joined: {new Date(member.joinedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <select
                    value={member.role}
                    onChange={(e) => handleRoleChange(member.id, member.userId, e.target.value)}
                    disabled={updatingMember === member.id}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                  >
                    <option value="PROJECT_LEAD">Project Lead</option>
                    <option value="CONTRIBUTOR">Contributor</option>
                    <option value="PROJECT_VIEWER">Viewer</option>
                  </select>

                  <button
                    onClick={() => handleRemoveMember(member.userId)}
                    className="px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}