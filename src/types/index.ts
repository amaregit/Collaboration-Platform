export interface User {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  globalStatus: 'ACTIVE' | 'BANNED' | 'ADMIN';
  createdAt: Date;
  updatedAt: Date;
}

export interface UserDevice {
  id: string;
  userId: string;
  refreshToken: string;
  ipAddress: string;
  userAgent: string;
  loginTime: Date;
  isRevoked: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: 'OWNER' | 'MEMBER' | 'VIEWER';
  joinedAt: Date;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  workspaceId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectMembership {
  id: string;
  projectId: string;
  userId: string;
  role: 'PROJECT_LEAD' | 'CONTRIBUTOR' | 'PROJECT_VIEWER';
  joinedAt: Date;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  projectId: string;
  createdById: string;
  assignedToIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  recipientId: string;
  status: 'DELIVERED' | 'SEEN';
  relatedEntityId?: string;
  createdAt: Date;
}

export interface AuditLog {
  id: string;
  timestamp: Date;
  level: string;
  userId?: string;
  ipAddress?: string;
  action: string;
  details?: Record<string, any>;
}

export interface AuthPayload {
  accessToken: string;
  refreshToken: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  globalStatus: string;
  iat?: number;
  exp?: number;
}

export interface PushSubscription {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
  createdAt: Date;
}

export interface Context {
  user?: JWTPayload;
  ipAddress?: string;
  userAgent?: string;
}