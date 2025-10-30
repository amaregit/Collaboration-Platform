'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CreateWorkspaceModal from '../../components/CreateWorkspaceModal';
import CreateProjectModal from '../../components/CreateProjectModal';
import CreateTaskModal from '../../components/CreateTaskModal';
import NotificationPanel from '../../components/NotificationPanel';
import RealTimeSubscription from '../../components/RealTimeSubscription';
import ProjectMemberManagementModal from '../../components/ProjectMemberManagementModal';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  globalStatus: string;
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

interface Project {
  id: string;
  name: string;
  description?: string;
  workspaceId: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  projectId: string;
  assignedToIds: string[];
  assignedUsers: User[];
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'workspaces' | 'projects' | 'tasks' | 'ai'>('workspaces');
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProjectMembers, setShowProjectMembers] = useState(false);
  const [selectedProjectForMembers, setSelectedProjectForMembers] = useState<{ id: string; name: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    console.log("Dashboard checkAuth - Token from localStorage:", token ? "Present" : "Missing");
    if (!token) {
      console.log("No token found, redirecting to login");
      router.push('/');
      return;
    }

    try {
      console.log("Making GraphQL request to /me endpoint");
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

      console.log("GraphQL response status:", response.status);
      const data = await response.json();
      console.log("GraphQL response data:", data);

      if (data.data?.me) {
        console.log("User authenticated successfully:", data.data.me);
        setUser(data.data.me);
        loadWorkspaces();
      } else {
        console.log("Authentication failed, removing token and redirecting");
        localStorage.removeItem('token');
        router.push('/');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('token');
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const loadWorkspaces = async () => {
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
              getWorkspaces {
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
      if (data.data?.getWorkspaces) {
        setWorkspaces(data.data.getWorkspaces);
      }
    } catch (error) {
      console.error('Failed to load workspaces:', error);
    }
  };

  const loadProjects = async (workspaceId: string) => {
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
            query GetProjects($workspaceId: ID!) {
              getProjects(workspaceId: $workspaceId) {
                id
                name
                description
                workspaceId
              }
            }
          `,
          variables: { workspaceId },
        }),
      });

      const data = await response.json();
      if (data.data?.getProjects) {
        setProjects(data.data.getProjects);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const loadTasks = async (projectId: string) => {
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
            query GetTasks($projectId: ID!) {
              getTasks(projectId: $projectId) {
                id
                title
                description
                status
                projectId
                assignedToIds
                assignedUsers {
                  id
                  email
                  firstName
                  lastName
                }
              }
            }
          `,
          variables: { projectId },
        }),
      });

      const data = await response.json();
      if (data.data?.getTasks) {
        setTasks(data.data.getTasks);
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
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

  const handleWorkspaceSelect = (workspaceId: string) => {
    setSelectedWorkspace(workspaceId);
    setSelectedProject('');
    setTasks([]);
    loadProjects(workspaceId);
    setActiveTab('projects');
  };

  const handleProjectSelect = (projectId: string) => {
    setSelectedProject(projectId);
    loadTasks(projectId);
    setActiveTab('tasks');
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
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
            mutation UpdateTaskStatus($id: ID!, $status: String!) {
              updateTaskStatus(id: $id, status: $status) {
                id
                status
              }
            }
          `,
          variables: { id: taskId, status: newStatus },
        }),
      });

      const data = await response.json();
      if (data.data?.updateTaskStatus) {
        // Update local state
        setTasks(prev =>
          prev.map(task =>
            task.id === taskId
              ? { ...task, status: newStatus }
              : task
          )
        );
      }
    } catch (error) {
      console.error('Failed to update task status:', error);
      alert('Failed to update task status');
    }
  };

  const handleRealTimeTaskUpdate = (updatedTask: any) => {
    // Update task in local state when real-time update is received
    setTasks(prev =>
      prev.map(task =>
        task.id === updatedTask.id
          ? { ...task, status: updatedTask.status }
          : task
      )
    );
  };

  const handleAISummary = async () => {
    const input = document.getElementById('summary-input') as HTMLTextAreaElement;
    const description = input?.value?.trim();
    if (!description) return;

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
            query SummarizeTask($description: String!) {
              summarizeTask(description: $description)
            }
          `,
          variables: { description },
        }),
      });

      const data = await response.json();
      if (data.data?.summarizeTask) {
        alert(`Summary: ${data.data.summarizeTask}`);
      } else {
        alert('Failed to generate summary');
      }
    } catch (error) {
      console.error('Failed to summarize task:', error);
      alert('Error generating summary');
    }
  };

  const handleAIGenerate = async () => {
    const input = document.getElementById('generate-input') as HTMLTextAreaElement;
    const prompt = input?.value?.trim();
    if (!prompt || !selectedProject) return;

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
            mutation GenerateTasks($projectId: ID!, $prompt: String!) {
              generateTasksFromPrompt(projectId: $projectId, prompt: $prompt)
            }
          `,
          variables: { projectId: selectedProject, prompt },
        }),
      });

      const data = await response.json();
      if (data.data?.generateTasksFromPrompt) {
        alert(`Generated tasks: ${data.data.generateTasksFromPrompt.join(', ')}`);
        loadTasks(selectedProject); // Refresh tasks
      } else {
        alert('Failed to generate tasks');
      }
    } catch (error) {
      console.error('Failed to generate tasks:', error);
      alert('Error generating tasks');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-gray-900">
              Collaboration Platform
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {user?.firstName} {user?.lastName}
              </span>
              <button
                onClick={() => setShowNotifications(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 relative"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.868 12.683A17.925 17.925 0 0112 21c7.962 0 12.21-8.21 4.868-12.683L12 3 4.868 12.683z" />
                </svg>
              </button>
              {selectedWorkspace && (
                <RealTimeSubscription
                  workspaceId={selectedWorkspace}
                  onTaskUpdate={handleRealTimeTaskUpdate}
                />
              )}
              {user?.globalStatus === 'ADMIN' && (
                <button
                  onClick={() => router.push('/admin')}
                  className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700"
                >
                  Admin Panel
                </button>
              )}
              <button
                onClick={handleLogout}
                className="bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700"
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
              { id: 'workspaces', label: 'Workspaces' },
              { id: 'projects', label: 'Projects' },
              { id: 'tasks', label: 'Tasks' },
              { id: 'ai', label: 'AI Assistant' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'workspaces' | 'projects' | 'tasks' | 'ai')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
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
            {activeTab === 'workspaces' && (
              <div>
                <div className="mb-4">
                  <button
                    onClick={() => setShowCreateWorkspace(true)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
                  >
                    Create New Workspace
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {workspaces.map((workspace) => (
                    <div
                      key={workspace.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleWorkspaceSelect(workspace.id)}
                    >
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {workspace.name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {workspace.members.length} members
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {workspace.members.slice(0, 3).map((member) => (
                          <span
                            key={member.id}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {member.user.firstName}
                          </span>
                        ))}
                        {workspace.members.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{workspace.members.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'projects' && selectedWorkspace && (
              <div>
                <div className="mb-4">
                  <button
                    onClick={() => setShowCreateProject(true)}
                    className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700"
                  >
                    Create New Project
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleProjectSelect(project.id)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {project.name}
                        </h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProjectForMembers({ id: project.id, name: project.name });
                            setShowProjectMembers(true);
                          }}
                          className="text-gray-400 hover:text-gray-600 p-1"
                          title="Manage Members"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                          </svg>
                        </button>
                      </div>
                      {project.description && (
                        <p className="text-sm text-gray-600 mb-2">
                          {project.description}
                        </p>
                      )}
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Project
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'tasks' && selectedProject && (
              <div>
                <div className="mb-4">
                  <button
                    onClick={() => setShowCreateTask(true)}
                    className="bg-purple-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-purple-700"
                  >
                    Create New Task
                  </button>
                </div>
                <div className="space-y-4">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {task.title}
                        </h3>
                        <div className="flex items-center space-x-2">
                          <select
                            value={task.status}
                            onChange={(e) => handleTaskStatusChange(task.id, e.target.value)}
                            className="text-xs border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          >
                            <option value="TODO">To Do</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="DONE">Done</option>
                          </select>
                        </div>
                      </div>
                      {task.description && (
                        <p className="text-sm text-gray-600 mb-2">
                          {task.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1">
                        {task.assignedUsers.map((user) => (
                          <span
                            key={user.id}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                          >
                            {user.firstName} {user.lastName}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="max-w-2xl">
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    AI Task Assistant
                  </h3>
                  <p className="text-sm text-gray-600">
                    Use AI to summarize tasks or generate new task ideas from prompts.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Summarize Task Description
                    </label>
                    <textarea
                      id="summary-input"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      rows={4}
                      placeholder="Enter a detailed task description to get a concise summary..."
                    />
                    <button
                      onClick={() => handleAISummary()}
                      className="mt-2 bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
                    >
                      Summarize
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Generate Tasks from Prompt
                    </label>
                    <textarea
                      id="generate-input"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      rows={4}
                      placeholder="Enter a high-level prompt like 'Build a user registration system'..."
                    />
                    <button
                      onClick={() => handleAIGenerate()}
                      className="mt-2 bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700"
                    >
                      Generate Tasks
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateWorkspaceModal
        isOpen={showCreateWorkspace}
        onClose={() => setShowCreateWorkspace(false)}
        onSuccess={loadWorkspaces}
      />

      <CreateProjectModal
        isOpen={showCreateProject}
        onClose={() => setShowCreateProject(false)}
        onSuccess={() => selectedWorkspace && loadProjects(selectedWorkspace)}
        workspaceId={selectedWorkspace}
      />

      <CreateTaskModal
        isOpen={showCreateTask}
        onClose={() => setShowCreateTask(false)}
        onSuccess={() => selectedProject && loadTasks(selectedProject)}
        projectId={selectedProject}
        workspaceId={selectedWorkspace}
      />

      <NotificationPanel
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />

      <ProjectMemberManagementModal
        isOpen={showProjectMembers}
        onClose={() => {
          setShowProjectMembers(false);
          setSelectedProjectForMembers(null);
        }}
        projectId={selectedProjectForMembers?.id || ''}
        projectName={selectedProjectForMembers?.name || ''}
      />
    </div>
  );
}