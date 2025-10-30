'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminResetPasswordModal from '../../components/AdminResetPasswordModal';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  globalStatus: 'ACTIVE' | 'BANNED' | 'ADMIN';
}

interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  members: Array<{
    id: string;
    userId: string;
    role: string;
    user: User;
  }>;
}

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allWorkspaces, setAllWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'workspaces'>('users');
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }

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
              me {
                id
                email
                firstName
                lastName
                globalStatus
              }
            }
          `,
        }),
      });

      const data = await response.json();
      if (data.data?.me && data.data.me.globalStatus === 'ADMIN') {
        setUser(data.data.me);
        loadAdminData();
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const loadAdminData = async () => {
    await Promise.all([loadAllUsers(), loadAllWorkspaces()]);
  };

  const loadAllUsers = async () => {
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
              getAllUsers {
                id
                email
                firstName
                lastName
                globalStatus
              }
            }
          `,
        }),
      });

      const data = await response.json();
      if (data.data?.getAllUsers) {
        setAllUsers(data.data.getAllUsers);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadAllWorkspaces = async () => {
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
              getAllWorkspaces {
                id
                name
                ownerId
                members {
                  id
                  userId
                  role
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
        }),
      });

      const data = await response.json();
      if (data.data?.getAllWorkspaces) {
        setAllWorkspaces(data.data.getAllWorkspaces);
      }
    } catch (error) {
      console.error('Failed to load workspaces:', error);
    }
  };

  const handleUserBan = async (userId: string) => {
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
            mutation BanUser($userId: ID!) {
              userBan(userId: $userId)
            }
          `,
          variables: { userId },
        }),
      });

      const data = await response.json();
      if (data.data?.userBan) {
        alert('User banned successfully');
        loadAllUsers();
      } else {
        alert('Failed to ban user');
      }
    } catch (error) {
      console.error('Failed to ban user:', error);
      alert('Error banning user');
    }
  };

  const handleUserUnban = async (userId: string) => {
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
            mutation UnbanUser($userId: ID!) {
              userUnban(userId: $userId)
            }
          `,
          variables: { userId },
        }),
      });

      const data = await response.json();
      if (data.data?.userUnban) {
        alert('User unbanned successfully');
        loadAllUsers();
      } else {
        alert('Failed to unban user');
      }
    } catch (error) {
      console.error('Failed to unban user:', error);
      alert('Error unbanning user');
    }
  };

  const handlePasswordReset = (userId: string, result: any) => {
    console.log('Password reset result:', result);
    alert(`Password reset successful! Temporary password: ${result.tempPassword}\n\nPlease share this with the user securely.`);
    loadAllUsers();
  };

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:4000/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.removeItem('token');
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-red-600 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-white">
              Admin Dashboard
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-white">
                Admin: {user?.firstName} {user?.lastName}
              </span>
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-white text-red-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-100"
              >
                Back to Dashboard
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-800"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            {[
              { id: 'users', label: 'User Management' },
              { id: 'workspaces', label: 'All Workspaces' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'users' | 'workspaces')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 capitalize">
              {activeTab}
            </h2>
          </div>

          <div className="p-6">
            {activeTab === 'users' && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {allUsers.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              user.globalStatus === 'ADMIN'
                                ? 'bg-red-100 text-red-800'
                                : user.globalStatus === 'BANNED'
                                ? 'bg-gray-100 text-gray-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {user.globalStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {user.globalStatus !== 'ADMIN' && (
                            <div className="flex space-x-2">
                              {user.globalStatus === 'ACTIVE' ? (
                                <button
                                  onClick={() => handleUserBan(user.id)}
                                  className="text-red-600 hover:text-red-900 bg-red-50 px-3 py-1 rounded-md text-xs"
                                >
                                  Ban User
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUserUnban(user.id)}
                                  className="text-green-600 hover:text-green-900 bg-green-50 px-3 py-1 rounded-md text-xs"
                                >
                                  Unban User
                                </button>
                              )}
                              <button
                                onClick={() => setShowResetPasswordModal(true)}
                                className="text-blue-600 hover:text-blue-900 bg-blue-50 px-3 py-1 rounded-md text-xs"
                              >
                                Reset Password
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'workspaces' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allWorkspaces.map((workspace) => (
                  <div
                    key={workspace.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {workspace.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      Owner: {workspace.members.find(m => m.userId === workspace.ownerId)?.user.firstName} {workspace.members.find(m => m.userId === workspace.ownerId)?.user.lastName}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      {workspace.members.length} members
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {workspace.members.slice(0, 4).map((member) => (
                        <span
                          key={member.id}
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            member.role === 'OWNER'
                              ? 'bg-purple-100 text-purple-800'
                              : member.role === 'MEMBER'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {member.user.firstName} ({member.role})
                        </span>
                      ))}
                      {workspace.members.length > 4 && (
                        <span className="text-xs text-gray-500">
                          +{workspace.members.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <AdminResetPasswordModal
        isOpen={showResetPasswordModal}
        onClose={() => setShowResetPasswordModal(false)}
        onPasswordReset={handlePasswordReset}
      />
    </div>
  );
}